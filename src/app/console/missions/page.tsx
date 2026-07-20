"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Play } from "lucide-react";
import { useI18n } from "@/modules/i18n/context";

type Agent = {
  role: string;
  status: string;
  output: string;
  ms: number;
};

type Run = {
  id: string;
  name: string;
  objective: string;
  target?: string;
  status: string;
  provider: string;
  agents: Agent[];
  synthesis: string;
  trainingSamples: number;
  startedAt: string;
  finishedAt: string;
};

type Provider = {
  id: string;
  label: string;
  available: boolean;
  notes: string;
  defaultModel: string;
};

export default function MissionsPage() {
  const { t } = useI18n();
  const [name, setName] = useState("Surface recon");
  const [objective, setObjective] = useState(
    "Authorized public footprint assessment for defensive hardening"
  );
  const [target, setTarget] = useState("example.com");
  const [provider, setProvider] = useState("hermes-native");
  const [useOpenClaw, setUseOpenClaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Run | null>(null);
  const [list, setList] = useState<Run[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  async function refresh() {
    const [h, l] = await Promise.all([
      fetch("/api/v1/hermes").then((r) => r.json()),
      fetch("/api/v1/llm").then((r) => r.json()),
    ]);
    setList(h.runs || []);
    setProviders(l.providers || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function launch() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective,
          target,
          provider: provider === "auto" ? "auto" : provider,
          useOpenClaw,
        }),
      });
      const run = await res.json();
      setActive(run);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Hermes
          </div>
        <h1 className="text-2xl font-semibold">{t("missions.title")}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <span
            key={p.id}
            className={p.available ? "lm-badge lm-badge-live" : "lm-badge lm-badge-warn"}
            title={p.notes}
          >
            {p.label}: {p.available ? "up" : "offline"} · {p.defaultModel}
          </span>
        ))}
      </div>

      <div className="lm-panel grid gap-3 rounded-lg p-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
            Mission name
          </label>
          <input className="lm-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
            Target domain / URL
          </label>
          <input
            className="lm-input font-mono"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
            Objective (ROE-aligned)
          </label>
          <textarea
            className="lm-input min-h-[72px]"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
            LLM backbone
          </label>
          <select
            className="lm-input"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="hermes-native">hermes-agent free (local)</option>
            <option value="auto">auto (native free → Ollama → cloud)</option>
            <option value="ollama-llama31">Ollama · Llama 3.1 local</option>
            <option value="openrouter">OpenRouter</option>
            <option value="openai-chatgpt">OpenAI</option>
            <option value="hermes-router">Helixara router only</option>
            <option value="openclaw">OpenClaw gateway</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-[var(--lm-muted)]">
            <input
              type="checkbox"
              checked={useOpenClaw}
              onChange={(e) => setUseOpenClaw(e.target.checked)}
            />
            Include OpenClaw specialist agent
          </label>
        </div>
        <div className="md:col-span-2">
          <button className="lm-btn" onClick={launch} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {loading ? "Running…" : t("missions.launch")}
          </button>
        </div>
      </div>

      {active ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-300" />
              <h2 className="font-medium">{active.name}</h2>
              <span
                className={
                  active.status === "completed"
                    ? "lm-badge lm-badge-live"
                    : "lm-badge lm-badge-warn"
                }
              >
                {active.status}
              </span>
              <span className="lm-badge">train samples {active.trainingSamples}</span>
              <span className="lm-badge">{active.provider}</span>
            </div>
            <div className="space-y-2">
              {active.agents?.map((a, i) => (
                <div
                  key={`${a.role}-${i}`}
                  className="rounded border border-[var(--lm-border)] bg-black/20 p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wider text-cyan-300/80">
                      {a.role}
                    </span>
                    <span className="lm-badge">
                      {a.status} · {a.ms}ms
                    </span>
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-[var(--lm-muted)]">
                    {a.output}
                  </pre>
                </div>
              ))}
            </div>
          </div>
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Synthesis / report
            </div>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--lm-muted)]">
              {active.synthesis}
            </pre>
          </div>
        </div>
      ) : null}

      {list.length > 0 ? (
        <div className="lm-panel rounded-lg p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
            Hermes history
          </div>
          <ul className="space-y-1 text-sm text-[var(--lm-muted)]">
            {list.map((m) => (
              <li key={m.id} className="flex flex-wrap gap-2">
                <button
                  className="text-cyan-300 hover:underline"
                  onClick={() => setActive(m)}
                >
                  {m.name}
                </button>
                <span className="lm-badge">{m.status}</span>
                <span className="font-mono text-[11px]">{m.id}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
