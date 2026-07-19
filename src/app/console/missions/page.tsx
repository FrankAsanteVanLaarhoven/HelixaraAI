"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Play } from "lucide-react";

type Task = {
  id: string;
  role: string;
  title: string;
  status: string;
  output?: string;
};

type Mission = {
  id: string;
  name: string;
  objective: string;
  target?: string;
  status: string;
  tasks: Task[];
  summary?: string;
  artifacts: { type: string; label: string }[];
  createdAt: string;
};

export default function MissionsPage() {
  const [name, setName] = useState("Surface recon alpha");
  const [objective, setObjective] = useState(
    "Authorized public footprint assessment for defensive hardening"
  );
  const [target, setTarget] = useState("example.com");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Mission | null>(null);
  const [list, setList] = useState<Mission[]>([]);

  async function refresh() {
    const res = await fetch("/api/v1/missions");
    const data = await res.json();
    setList(data.missions || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function launch() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, objective, target }),
      });
      const mission = await res.json();
      setActive(mission);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Module · Agentic Red Team (Authorized)
        </div>
        <h1 className="text-2xl font-semibold">Mission Swarm</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
          Multi-agent pipeline: commander → recon → OSINT → analyst → scribe.
          Agents plan and report — they do not generate exploits or bypass legal
          controls.
        </p>
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
        <div className="md:col-span-2">
          <button className="lm-btn" onClick={launch} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {loading ? "Agents running…" : "Launch mission"}
          </button>
        </div>
      </div>

      {active ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2">
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
            </div>
            <div className="space-y-2">
              {active.tasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded border border-[var(--lm-border)] bg-black/20 p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wider text-cyan-300/80">
                      {t.role}
                    </span>
                    <span className="lm-badge">{t.status}</span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--lm-text)]">{t.title}</div>
                  {t.output ? (
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-[var(--lm-muted)]">
                      {t.output}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Mission report draft
            </div>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--lm-muted)]">
              {active.summary || "Report pending…"}
            </pre>
            {active.artifacts?.length ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {active.artifacts.map((a, i) => (
                  <span key={i} className="lm-badge">
                    {a.type}: {a.label.slice(0, 40)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {list.length > 0 ? (
        <div className="lm-panel rounded-lg p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
            Mission history (in-memory)
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
