/**
 * Helixara OS privacy modes — local-first ownership.
 * vault: only local Ollama (data stays on machine)
 * connected: cloud providers allowed (OpenRouter / ChatGPT / OpenClaw)
 * hybrid: prefer local, fall back to cloud with audit note
 */

export type PrivacyMode = "vault" | "connected" | "hybrid";

export type CloudProviderId =
  | "openai-chatgpt"
  | "openrouter"
  | "openclaw";

let mode: PrivacyMode =
  (process.env.HELIXARA_PRIVACY_MODE as PrivacyMode) || "hybrid";

export function getPrivacyMode(): PrivacyMode {
  return mode;
}

export function setPrivacyMode(next: PrivacyMode): PrivacyMode {
  mode = next;
  return mode;
}

export function cloudAllowed(): boolean {
  return mode === "connected" || mode === "hybrid";
}

export function vaultOnly(): boolean {
  return mode === "vault";
}

export function privacyPolicy() {
  return {
    mode,
    modes: {
      vault: {
        label: "Vault",
        description:
          "Local Ollama only. Client data, health, finances, proprietary IP stay on-box. Works offline.",
        providers: ["ollama-llama31", "hermes-router"],
      },
      hybrid: {
        label: "Hybrid",
        description:
          "Prefer local models; fall back to cloud with audit trail when needed.",
        providers: [
          "ollama-llama31",
          "openrouter",
          "openai-chatgpt",
          "openclaw",
          "hermes-router",
        ],
      },
      connected: {
        label: "Connected",
        description:
          "Performance mode — OpenRouter / ChatGPT / OpenClaw allowed for max quality & web context.",
        providers: [
          "ollama-llama31",
          "openrouter",
          "openai-chatgpt",
          "openclaw",
          "hermes-router",
        ],
      },
    },
    ownership:
      "Sovereign stack: you own the models, memory, and audit trail. No vendor lock-in required.",
  };
}

/** Block cloud providers in vault mode */
export function assertProviderAllowed(
  provider: string
): { ok: true } | { ok: false; reason: string } {
  if (mode !== "vault") return { ok: true };
  const local = ["ollama-llama31", "hermes-router", "auto"];
  if (local.includes(provider)) return { ok: true };
  return {
    ok: false,
    reason: `Vault mode blocks cloud provider "${provider}". Switch to hybrid/connected or use Ollama.`,
  };
}
