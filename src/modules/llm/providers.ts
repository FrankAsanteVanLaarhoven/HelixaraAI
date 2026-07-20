/**
 * Multi-provider LLM layer for agent training & missions.
 * Providers: Ollama, OpenAI, OpenRouter, hermes-agent (native free), OpenClaw.
 */

import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";
import {
  assertProviderAllowed,
  getPrivacyMode,
  vaultOnly,
} from "@/modules/os/privacy";
import {
  completeViaHermesNative,
  getHermesNativeStatus,
} from "@/modules/agents/hermesNative";

export type LLMProviderId =
  | "ollama-llama31"
  | "openai-chatgpt"
  | "openrouter"
  | "hermes-router"
  | "hermes-native"
  | "openclaw";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  provider?: LLMProviderId;
  model?: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  /** training / fine-tune style tagging */
  purpose?: "inference" | "training_sample" | "agent_plan" | "report";
}

export interface LLMResponse {
  id: string;
  provider: LLMProviderId;
  model: string;
  content: string;
  latencyMs: number;
  usage?: { promptTokens?: number; completionTokens?: number };
  trainingLogged: boolean;
  fallback?: boolean;
  error?: string;
}

export interface ProviderHealth {
  id: LLMProviderId;
  label: string;
  available: boolean;
  endpoint: string;
  defaultModel: string;
  notes: string;
}

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/auto";
const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || "";

/** In-memory training corpus samples (exportable for fine-tune pipelines) */
const trainingSamples: {
  id: string;
  ts: string;
  provider: string;
  model: string;
  messages: LLMMessage[];
  completion: string;
  purpose: string;
}[] = [];

export function listTrainingSamples(limit = 50) {
  return trainingSamples.slice(0, limit);
}

export async function probeProviders(): Promise<ProviderHealth[]> {
  const results: ProviderHealth[] = [];

  // Ollama / Llama 3.1
  let ollamaOk = false;
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    ollamaOk = r.ok;
  } catch {
    ollamaOk = false;
  }
  results.push({
    id: "ollama-llama31",
    label: "Ollama · Llama 3.1 (local)",
    available: ollamaOk,
    endpoint: OLLAMA_BASE,
    defaultModel: process.env.OLLAMA_MODEL || "llama3.1",
    notes: ollamaOk
      ? "Local sovereign inference ready"
      : "Start Ollama and pull llama3.1: ollama pull llama3.1",
  });

  results.push({
    id: "openai-chatgpt",
    label: "OpenAI · ChatGPT",
    available: Boolean(OPENAI_KEY),
    endpoint: OPENAI_BASE,
    defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    notes: OPENAI_KEY
      ? "API key configured"
      : "Set OPENAI_API_KEY for ChatGPT agent training",
  });

  results.push({
    id: "openrouter",
    label: "OpenRouter (100+ models · Hermes-compatible)",
    available: Boolean(OPENROUTER_KEY),
    endpoint: OPENROUTER_BASE,
    defaultModel: OPENROUTER_MODEL,
    notes: OPENROUTER_KEY
      ? "OpenRouter key configured — route free or paid models"
      : "Set OPENROUTER_API_KEY (same pattern as cloud Hermes setups)",
  });

  results.push({
    id: "hermes-router",
    label: "Helixara multi-agent router",
    available: true,
    endpoint: "internal://hermes",
    defaultModel: "hermes-ensemble",
    notes: "Parallel specialist agents with LLM fan-out + Kanban handoff",
  });

  // Local hermes-agent (installed from Desktop tree; free models)
  let nativeOk = false;
  let nativeNotes = "Run: npm run hermes:install && npm run hermes:bridge";
  let nativeModel = process.env.HERMES_FREE_MODEL || "free";
  try {
    const st = await getHermesNativeStatus();
    nativeOk = Boolean(st.ok || st.importOk);
    nativeModel = st.defaultModel || nativeModel;
    nativeNotes = nativeOk
      ? `hermes-agent ${st.version || ""} · free models · ${st.bridgeMode || "subprocess"}`.trim()
      : st.error || nativeNotes;
  } catch {
    nativeOk = false;
  }
  results.push({
    id: "hermes-native",
    label: "hermes-agent (local free)",
    available: nativeOk,
    endpoint: process.env.HERMES_BRIDGE_URL || "http://127.0.0.1:18790",
    defaultModel: nativeModel,
    notes: nativeNotes,
  });

  let clawOk = false;
  try {
    const r = await fetch(`${OPENCLAW_URL}/health`, {
      signal: AbortSignal.timeout(2000),
      headers: OPENCLAW_TOKEN
        ? { Authorization: `Bearer ${OPENCLAW_TOKEN}` }
        : {},
    });
    clawOk = r.ok;
  } catch {
    clawOk = false;
  }
  results.push({
    id: "openclaw",
    label: "OpenClaw gateway",
    available: clawOk,
    endpoint: OPENCLAW_URL,
    defaultModel: "openclaw-default",
    notes: clawOk
      ? "OpenClaw gateway reachable"
      : "Optional: run OpenClaw locally and set OPENCLAW_GATEWAY_URL",
  });

  return results;
}

function pickDefaultProvider(
  health: ProviderHealth[],
  preferred?: LLMProviderId
): LLMProviderId {
  const vault = vaultOnly();
  if (preferred) {
    const gate = assertProviderAllowed(preferred);
    if (gate.ok && health.find((h) => h.id === preferred)?.available) {
      return preferred;
    }
    if (preferred === "hermes-router") return "hermes-router";
    if (preferred === "hermes-native") return "hermes-native";
  }
  if (health.find((h) => h.id === "hermes-native")?.available)
    return "hermes-native";
  if (health.find((h) => h.id === "ollama-llama31")?.available)
    return "ollama-llama31";
  if (vault) return "hermes-router";
  if (health.find((h) => h.id === "openrouter")?.available) return "openrouter";
  if (health.find((h) => h.id === "openai-chatgpt")?.available)
    return "openai-chatgpt";
  if (health.find((h) => h.id === "openclaw")?.available) return "openclaw";
  return "hermes-router";
}

async function callHermesNative(req: LLMRequest): Promise<LLMResponse> {
  const started = Date.now();
  const model = req.model || process.env.HERMES_FREE_MODEL || "free";
  const result = await completeViaHermesNative({
    messages: req.messages,
    model,
  });
  return {
    id: uid("llm"),
    provider: "hermes-native",
    model: result.model || model,
    content: result.content || "",
    latencyMs: result.latencyMs || Date.now() - started,
    trainingLogged: false,
    fallback: result.fallback,
    error: result.error,
  };
}

async function callOllama(req: LLMRequest): Promise<LLMResponse> {
  const model = req.model || process.env.OLLAMA_MODEL || "llama3.1";
  const started = Date.now();
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature ?? 0.3,
        num_predict: req.maxTokens ?? 1024,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as {
    message?: { content?: string };
  };
  return {
    id: uid("llm"),
    provider: "ollama-llama31",
    model,
    content: data.message?.content || "",
    latencyMs: Date.now() - started,
    trainingLogged: false,
  };
}

async function callOpenAI(req: LLMRequest): Promise<LLMResponse> {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set");
  const model = req.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const started = Date.now();
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 1024,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    id: uid("llm"),
    provider: "openai-chatgpt",
    model,
    content: data.choices?.[0]?.message?.content || "",
    latencyMs: Date.now() - started,
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    },
    trainingLogged: false,
  };
}

async function callOpenRouter(req: LLMRequest): Promise<LLMResponse> {
  if (!OPENROUTER_KEY) throw new Error("OPENROUTER_API_KEY not set");
  const model = req.model || OPENROUTER_MODEL;
  const started = Date.now();
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://github.com/FrankAsanteVanLaarhoven/HelixaraAI",
      "X-Title": "HelixaraAI",
    },
    body: JSON.stringify({
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 1024,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    id: uid("llm"),
    provider: "openrouter",
    model,
    content: data.choices?.[0]?.message?.content || "",
    latencyMs: Date.now() - started,
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    },
    trainingLogged: false,
  };
}

async function callOpenClaw(req: LLMRequest): Promise<LLMResponse> {
  const started = Date.now();
  const prompt = req.messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const res = await fetch(`${OPENCLAW_URL}/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(OPENCLAW_TOKEN ? { Authorization: `Bearer ${OPENCLAW_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      message: prompt,
      purpose: req.purpose || "agent_plan",
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`OpenClaw HTTP ${res.status}`);
  const data = (await res.json()) as { reply?: string; content?: string };
  return {
    id: uid("llm"),
    provider: "openclaw",
    model: "openclaw-default",
    content: data.reply || data.content || JSON.stringify(data).slice(0, 4000),
    latencyMs: Date.now() - started,
    trainingLogged: false,
  };
}

/** Deterministic Hermes ensemble when no remote LLM is available */
function hermesFallback(req: LLMRequest): LLMResponse {
  const user = [...req.messages].reverse().find((m) => m.role === "user")?.content || "";
  const system = req.messages.find((m) => m.role === "system")?.content || "";
  const content = [
    `[Helixara ensemble · offline-capable specialist routing]`,
    ``,
    `Objective digest: ${user.slice(0, 400)}`,
    system ? `Constraints: ${system.slice(0, 240)}` : "",
    ``,
    `Plan:`,
    `1. Authorize under ROE / engagement scope`,
    `2. Recon specialist — public surface + stealth crawl`,
    `3. OSINT specialist — DNS/CT/headers enrichment`,
    `4. Analyst specialist — correlate IOCs + geospatial pins`,
    `5. Scribe specialist — executive + technical report`,
    ``,
    `Providers preferred for training: ollama-llama31 (local), openai-chatgpt, openclaw gateway.`,
    `No exploit generation. Defensive authorized operations only.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: uid("llm"),
    provider: "hermes-router",
    model: "hermes-ensemble",
    content,
    latencyMs: 12,
    trainingLogged: false,
    fallback: true,
  };
}

export async function completeLLM(req: LLMRequest): Promise<LLMResponse> {
  const health = await probeProviders();
  let preferred = req.provider;
  if (
    preferred &&
    preferred !== "hermes-router" &&
    preferred !== "hermes-native"
  ) {
    const gate = assertProviderAllowed(preferred);
    if (!gate.ok) {
      // force local path in vault
      preferred = health.find((h) => h.id === "hermes-native")?.available
        ? "hermes-native"
        : health.find((h) => h.id === "ollama-llama31")?.available
          ? "ollama-llama31"
          : "hermes-router";
    }
  }
  const provider = pickDefaultProvider(health, preferred);
  let result: LLMResponse;
  const privacyMode = getPrivacyMode();

  try {
    if (provider === "ollama-llama31") result = await callOllama(req);
    else if (provider === "openai-chatgpt") result = await callOpenAI(req);
    else if (provider === "openrouter") result = await callOpenRouter(req);
    else if (provider === "hermes-native") result = await callHermesNative(req);
    else if (provider === "openclaw") result = await callOpenClaw(req);
    else result = hermesFallback(req);
  } catch (err) {
    // cascade fallbacks (respect vault — no cloud escape hatch)
    try {
      if (provider !== "ollama-llama31" && health.find((h) => h.id === "ollama-llama31")?.available) {
        result = await callOllama(req);
        result.fallback = true;
      } else if (
        !vaultOnly() &&
        provider !== "openrouter" &&
        health.find((h) => h.id === "openrouter")?.available
      ) {
        result = await callOpenRouter(req);
        result.fallback = true;
      } else if (
        !vaultOnly() &&
        provider !== "openai-chatgpt" &&
        health.find((h) => h.id === "openai-chatgpt")?.available
      ) {
        result = await callOpenAI(req);
        result.fallback = true;
      } else {
        result = hermesFallback(req);
        result.error = err instanceof Error ? err.message : "llm failed";
      }
    } catch (err2) {
      result = hermesFallback(req);
      result.error =
        err2 instanceof Error ? err2.message : err instanceof Error ? err.message : "llm failed";
    }
  }

  // annotate privacy on event payload via temporary field
  void privacyMode;

  if (req.purpose === "training_sample" || req.purpose === "agent_plan") {
    trainingSamples.unshift({
      id: result.id,
      ts: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      messages: req.messages,
      completion: result.content,
      purpose: req.purpose,
    });
    if (trainingSamples.length > 500) trainingSamples.pop();
    result.trainingLogged = true;
  }

  emitEvent({
    type: "llm.completion",
    source: `llm.${result.provider}`,
    severity: result.error ? "warn" : "info",
    title: `LLM ${result.provider} · ${result.model}`,
    payload: {
      latencyMs: result.latencyMs,
      trainingLogged: result.trainingLogged,
      fallback: result.fallback,
    },
  });

  return result;
}
