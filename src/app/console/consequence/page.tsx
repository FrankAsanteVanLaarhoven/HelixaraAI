"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Loader2, RefreshCw, Send } from "lucide-react";

type Advice = {
  id: string;
  advisedAt: string;
  context: string;
  advice: string;
  category: string;
  explainability: {
    rationale: string;
    factors: { key: string; value: string; weight?: number }[];
    sources: string[];
    method: string;
    confidence: number;
    alternatives?: string[];
  };
  outcome?: {
    labeledAt: string;
    label: string;
    whatHappened: string;
    impact?: string;
  };
};

export default function ConsequencePage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [model, setModel] = useState<Record<string, unknown> | null>(null);
  const [list, setList] = useState<Advice[]>([]);
  const [selected, setSelected] = useState<Advice | null>(null);
  const [question, setQuestion] = useState(
    "What should we do next after a deauth flood alert on our lab SSID?"
  );
  const [context, setContext] = useState(
    "Authorised lab WIDS raised DEAUTH-FLOOD-BCAST. Engagement LAB-BOOKING-001. No production clients."
  );
  const [category, setCategory] = useState("wireless-ir");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(
    null
  );
  const [outcomeText, setOutcomeText] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/consequence?limit=40");
    const data = await res.json();
    setStats(data.stats);
    setModel(data.model);
    setList(data.advice || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function advise() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/v1/consequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advise",
          question,
          context,
          category,
          provider: "auto",
          engagementId: "DEMO-LAB-001",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "advise failed");
        return;
      }
      setLastResult(data);
      await load();
      const full = await fetch(`/api/v1/consequence?id=${data.adviceId}`).then(
        (r) => r.json()
      );
      if (full.advice) setSelected(full.advice);
    } finally {
      setLoading(false);
    }
  }

  async function label(label: "good" | "bad" | "mixed") {
    if (!selected) return;
    if (!outcomeText.trim()) {
      setMsg("Describe what happened after the advice");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/consequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "label",
          adviceId: selected.id,
          label,
          whatHappened: outcomeText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "label failed");
        return;
      }
      setSelected(data.advice);
      setOutcomeText("");
      setMsg(`Labeled ${label} · timestamps stored`);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function train() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/v1/consequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "train" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "train failed");
        return;
      }
      setModel(data.model);
      setStats(data.stats);
      setMsg(`Model ${data.model.version} trained on ${data.model.sampleCount} samples`);
    } finally {
      setLoading(false);
    }
  }

  async function exportTrain() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/consequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export" }),
      });
      const data = await res.json();
      setMsg(
        data.count
          ? `Exported ${data.count} pairs → ${data.path}`
          : "No labeled pairs to export yet"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Must-have · Consequence AI
          </div>
          <h1 className="text-2xl font-semibold">
            Advice → outcome → train
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
            Every recommendation is logged with <strong>timestamps</strong> and{" "}
            <strong>explainability</strong>. You record what happened after
            good or bad advice; Helixara trains a local consequence model so we
            are not stuck with opaque third-party limits alone.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="lm-btn" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="lm-btn" disabled={loading} onClick={train}>
            <Brain className="h-4 w-4" />
            Train model
          </button>
          <button className="lm-btn lm-btn-amber" disabled={loading} onClick={exportTrain}>
            Export JSONL
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Total advice" value={String(stats?.total ?? "—")} />
        <Metric label="Unlabeled" value={String(stats?.unlabeled ?? "—")} />
        <Metric label="Good" value={String(stats?.good ?? "—")} tone="green" />
        <Metric label="Bad" value={String(stats?.bad ?? "—")} tone="red" />
        <Metric
          label="Model"
          value={
            model
              ? String((model as { version?: string }).version || "ready")
              : "untrained"
          }
        />
      </div>

      {msg ? (
        <div className="rounded border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lm-panel space-y-3 rounded-lg p-4">
          <div className="text-sm font-medium text-cyan-200">Ask + auto-log</div>
          <label className="block text-[11px] text-[var(--lm-muted)]">
            Category
            <input
              className="lm-input mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label className="block text-[11px] text-[var(--lm-muted)]">
            Context (what is going on)
            <textarea
              className="lm-input mt-1 min-h-[80px]"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </label>
          <label className="block text-[11px] text-[var(--lm-muted)]">
            Question
            <textarea
              className="lm-input mt-1 min-h-[60px]"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <button className="lm-btn" disabled={loading} onClick={advise}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Generate advice (timestamped + explained)
          </button>

          {lastResult ? (
            <div className="rounded border border-[var(--lm-border)] bg-black/25 p-3 text-xs">
              <div className="font-mono text-cyan-200">
                {String(lastResult.adviceId)} · {String(lastResult.advisedAt)}
              </div>
              <div className="mt-1 text-[var(--lm-muted)]">
                Predicted:{" "}
                {String(
                  (lastResult.consequenceScore as { predictedQuality?: string })
                    ?.predictedQuality
                )}{" "}
                · score{" "}
                {Number(
                  (lastResult.consequenceScore as { score?: number })?.score
                ).toFixed(2)}
              </div>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-[var(--lm-muted)]">
                {String(lastResult.advice)}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="lm-panel space-y-3 rounded-lg p-4">
          <div className="text-sm font-medium text-cyan-200">
            Ledger · label what happened after
          </div>
          <ul className="max-h-48 space-y-1 overflow-auto text-[11px]">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={`w-full rounded border px-2 py-1.5 text-left ${
                    selected?.id === a.id
                      ? "border-cyan-400/50 bg-cyan-400/10"
                      : "border-[var(--lm-border)]"
                  }`}
                  onClick={() => setSelected(a)}
                >
                  <span className="font-mono text-cyan-200/90">{a.id}</span>{" "}
                  <span className="text-[var(--lm-muted)]">
                    {new Date(a.advisedAt).toLocaleString()}
                  </span>
                  {a.outcome ? (
                    <span className="lm-badge ms-1">{a.outcome.label}</span>
                  ) : (
                    <span className="lm-badge lm-badge-warn ms-1">pending</span>
                  )}
                  <div className="truncate text-[var(--lm-text)]">
                    {a.advice.slice(0, 100)}
                  </div>
                </button>
              </li>
            ))}
            {!list.length ? (
              <li className="text-[var(--lm-muted)]">No advice yet</li>
            ) : null}
          </ul>

          {selected ? (
            <div className="space-y-2 border-t border-[var(--lm-border)] pt-3 text-xs">
              <div className="font-mono text-[10px] text-cyan-200">
                advisedAt {selected.advisedAt}
                {selected.outcome
                  ? ` · labeledAt ${selected.outcome.labeledAt}`
                  : ""}
              </div>
              <div>
                <div className="text-[10px] uppercase text-[var(--lm-muted)]">
                  Explainability
                </div>
                <p className="text-[var(--lm-muted)]">
                  {selected.explainability.rationale}
                </p>
                <div className="mt-1 text-[10px] text-cyan-100/70">
                  method {selected.explainability.method} · confidence{" "}
                  {(selected.explainability.confidence * 100).toFixed(0)}%
                </div>
                <ul className="mt-1 text-[10px] text-[var(--lm-muted)]">
                  {selected.explainability.factors.map((f) => (
                    <li key={f.key}>
                      · {f.key}={f.value}
                    </li>
                  ))}
                </ul>
                <div className="mt-1 text-[10px]">
                  sources: {selected.explainability.sources.join(", ")}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[var(--lm-muted)]">
                  Advice
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[var(--lm-muted)]">
                  {selected.advice}
                </pre>
              </div>
              {!selected.outcome ? (
                <>
                  <textarea
                    className="lm-input min-h-[70px] text-xs"
                    placeholder="What happened after this advice? (required for training)"
                    value={outcomeText}
                    onChange={(e) => setOutcomeText(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="lm-btn"
                      disabled={loading}
                      onClick={() => label("good")}
                    >
                      Good outcome
                    </button>
                    <button
                      className="lm-btn lm-btn-amber"
                      disabled={loading}
                      onClick={() => label("mixed")}
                    >
                      Mixed
                    </button>
                    <button
                      className="lm-btn"
                      style={{ borderColor: "rgba(255,77,106,0.5)", color: "#ff4d6a" }}
                      disabled={loading}
                      onClick={() => label("bad")}
                    >
                      Bad outcome
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded border border-emerald-400/30 bg-emerald-400/5 p-2">
                  Outcome <strong>{selected.outcome.label}</strong> at{" "}
                  {selected.outcome.labeledAt}
                  <div className="mt-1 text-[var(--lm-muted)]">
                    {selected.outcome.whatHappened}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {model ? (
        <div className="lm-panel rounded-lg p-4 text-xs text-[var(--lm-muted)]">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Trained consequence model
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
            {JSON.stringify(model, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: "cyan" | "green" | "red";
}) {
  const c =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-rose-300"
        : "text-cyan-300";
  return (
    <div className="lm-panel rounded-lg p-3">
      <div className="text-[10px] uppercase text-[var(--lm-muted)]">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${c}`}>{value}</div>
    </div>
  );
}
