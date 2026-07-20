/**
 * Ollama local model hub — list / pull status / recommend.
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

export interface OllamaModel {
  name: string;
  size?: number;
  modifiedAt?: string;
  digest?: string;
}

export async function ollamaHealth(): Promise<{
  online: boolean;
  base: string;
  version?: string;
  error?: string;
}> {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/version`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) {
      return { online: false, base: OLLAMA_BASE, error: `HTTP ${r.status}` };
    }
    const data = (await r.json()) as { version?: string };
    return { online: true, base: OLLAMA_BASE, version: data.version };
  } catch (e) {
    return {
      online: false,
      base: OLLAMA_BASE,
      error: e instanceof Error ? e.message : "unreachable",
    };
  }
}

export async function listOllamaModels(): Promise<OllamaModel[]> {
  const r = await fetch(`${OLLAMA_BASE}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`Ollama tags HTTP ${r.status}`);
  const data = (await r.json()) as {
    models?: { name: string; size?: number; modified_at?: string; digest?: string }[];
  };
  return (data.models || []).map((m) => ({
    name: m.name,
    size: m.size,
    modifiedAt: m.modified_at,
    digest: m.digest,
  }));
}

/** Hardware-agnostic recommendations (user can pick by RAM class) */
export function recommendModels(classHint: "fast" | "balanced" | "max" = "balanced") {
  const table = {
    fast: [
      { name: "llama3.2:3b", why: "Fast chat on modest RAM" },
      { name: "gemma2:2b", why: "Tiny local assistant" },
      { name: "qwen2.5:3b", why: "Strong small generalist" },
    ],
    balanced: [
      { name: "llama3.1:8b", why: "Solid default for agents" },
      { name: "qwen2.5:14b", why: "Strong reasoning if ≥16GB RAM" },
      { name: "mistral:7b", why: "Efficient general model" },
    ],
    max: [
      { name: "qwen2.5:32b", why: "Top local quality if high VRAM/RAM" },
      { name: "llama3.1:70b", why: "Heavy — desktop GPU class" },
      { name: "deepseek-r1:14b", why: "Reasoning-oriented local" },
    ],
  };
  return {
    classHint,
    install: "ollama pull <name>",
    models: table[classHint],
    note: "Local models trail frontier cloud by ~months, not years — good enough for vault work.",
  };
}

export async function getOllamaHub() {
  const health = await ollamaHealth();
  let installed: OllamaModel[] = [];
  if (health.online) {
    try {
      installed = await listOllamaModels();
    } catch {
      installed = [];
    }
  }
  return {
    health,
    installed,
    recommend: {
      fast: recommendModels("fast"),
      balanced: recommendModels("balanced"),
      max: recommendModels("max"),
    },
    defaultModel: process.env.OLLAMA_MODEL || "llama3.1",
  };
}
