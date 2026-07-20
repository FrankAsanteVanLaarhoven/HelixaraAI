/**
 * HelixaraAI bridge client for local hermes-agent (NousResearch source
 * installed from Desktop — no upstream fork/contribution).
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const ROOT = process.cwd();
const BRIDGE_PY = path.join(ROOT, "integrations", "hermes", "bridge.py");
const VENV_PY = path.join(ROOT, ".runtime", "hermes-venv", "bin", "python");
const BRIDGE_URL =
  process.env.HERMES_BRIDGE_URL || "http://127.0.0.1:18790";
const AGENT_ROOT =
  process.env.HERMES_AGENT_ROOT ||
  path.join(process.env.HOME || "", "Desktop", "hermes-agent-main");

export type FreeModelId =
  | "free"
  | "helixara-free"
  | "llama31-free"
  | "llama32-free"
  | "ollama-free"
  | "helixara-ensemble"
  | string;

export interface HermesNativeStatus {
  ok: boolean;
  engine?: string;
  version?: string;
  agentRoot?: string;
  hermesHome?: string;
  importOk?: boolean;
  ollama?: boolean;
  freeModels?: {
    id: string;
    model: string;
    tier: string;
    label: string;
  }[];
  defaultModel?: string;
  error?: string;
  bridgeUrl?: string;
  bridgeMode?: "http" | "subprocess" | "unavailable";
}

export interface HermesNativeRunResult {
  ok: boolean;
  provider: string;
  model: string;
  tier?: string;
  content: string;
  latencyMs: number;
  fallback?: boolean;
  error?: string;
  engine?: string;
  version?: string;
}

function pythonBin(): string {
  if (fs.existsSync(VENV_PY)) return VENV_PY;
  return process.env.HERMES_PYTHON || "python3";
}

function runBridgeCli(
  args: string[],
  timeoutMs = 120_000
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      HERMES_HOME:
        process.env.HERMES_HOME || path.join(ROOT, ".runtime", "hermes-home"),
      HERMES_AGENT_ROOT: AGENT_ROOT,
      HERMES_CLI_CONFIG:
        process.env.HERMES_CLI_CONFIG ||
        path.join(ROOT, "integrations", "hermes", "cli-config.yaml"),
      PYTHONPATH: [AGENT_ROOT, process.env.PYTHONPATH || ""]
        .filter(Boolean)
        .join(path.delimiter),
    };
    const child = spawn(pythonBin(), [BRIDGE_PY, ...args], {
      env,
      cwd: ROOT,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ code: 124, stdout, stderr: stderr + "\ntimeout" });
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

export async function getHermesNativeStatus(): Promise<HermesNativeStatus> {
  // Prefer live HTTP bridge
  try {
    const r = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (r.ok) {
      const data = (await r.json()) as HermesNativeStatus;
      return {
        ...data,
        bridgeUrl: BRIDGE_URL,
        bridgeMode: "http",
      };
    }
  } catch {
    /* fall through */
  }

  if (!fs.existsSync(BRIDGE_PY)) {
    return {
      ok: false,
      error: "bridge.py missing",
      bridgeMode: "unavailable",
      agentRoot: AGENT_ROOT,
    };
  }

  const { code, stdout, stderr } = await runBridgeCli(["status"], 15_000);
  if (code !== 0) {
    return {
      ok: false,
      error: stderr || stdout || `bridge exit ${code}`,
      bridgeMode: "subprocess",
      agentRoot: AGENT_ROOT,
    };
  }
  try {
    const data = JSON.parse(stdout) as HermesNativeStatus;
    return { ...data, bridgeMode: "subprocess", bridgeUrl: BRIDGE_URL };
  } catch {
    return {
      ok: false,
      error: "invalid status JSON",
      bridgeMode: "subprocess",
    };
  }
}

export async function listFreeModels() {
  const st = await getHermesNativeStatus();
  return st.freeModels || [
    { id: "free", model: "llama3.1", tier: "free", label: "Helixara free" },
    {
      id: "helixara-ensemble",
      model: "helixara-ensemble",
      tier: "free",
      label: "Helixara ensemble",
    },
  ];
}

export async function runHermesNative(input: {
  prompt: string;
  system?: string;
  model?: FreeModelId;
  maxIterations?: number;
}): Promise<HermesNativeRunResult> {
  const model = input.model || process.env.HERMES_FREE_MODEL || "free";

  // HTTP bridge first
  try {
    const r = await fetch(`${BRIDGE_URL}/v1/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input.prompt,
        system: input.system,
        model,
        max_iterations: input.maxIterations ?? 8,
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (r.ok) {
      return (await r.json()) as HermesNativeRunResult;
    }
  } catch {
    /* subprocess fallback */
  }

  const args = ["run", "--prompt", input.prompt, "--model", model];
  if (input.system) args.push("--system", input.system);
  if (input.maxIterations)
    args.push("--max-iterations", String(input.maxIterations));

  const { code, stdout, stderr } = await runBridgeCli(args, 180_000);
  if (code !== 0) {
    return {
      ok: false,
      provider: "hermes-native",
      model: String(model),
      content: "",
      latencyMs: 0,
      error: stderr || stdout || `exit ${code}`,
      fallback: true,
    };
  }
  try {
    return JSON.parse(stdout) as HermesNativeRunResult;
  } catch {
    return {
      ok: true,
      provider: "hermes-native",
      model: String(model),
      content: stdout,
      latencyMs: 0,
    };
  }
}

export async function completeViaHermesNative(input: {
  messages: { role: string; content: string }[];
  model?: FreeModelId;
}): Promise<HermesNativeRunResult> {
  const system =
    input.messages.find((m) => m.role === "system")?.content || "";
  const prompt = input.messages
    .filter((m) => m.role !== "system")
    .map((m) => (m.role === "user" ? m.content : `${m.role}: ${m.content}`))
    .join("\n");
  return runHermesNative({
    prompt,
    system,
    model: input.model || "free",
  });
}
