"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  prompt: string;
  kind: string;
  column: string;
  parentId?: string;
  childrenIds: string[];
  telegramNotify: boolean;
  result?: string;
  blockedReason?: string;
};

type Board = {
  columns: Record<string, Task[]>;
  total: number;
  policy: string;
};

const COLS = ["todo", "ready", "in_progress", "blocked", "done"] as const;

export default function KanbanPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [title, setTitle] = useState("Authorized OSINT research");
  const [prompt, setPrompt] = useState(
    "Research public attack-surface signals for example.com under ROE — DNS, CT, headers only."
  );
  const [parentId, setParentId] = useState("");
  const [telegramNotify, setTelegramNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/kanban");
    const data = await res.json();
    setBoard(data.board);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createTask() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          prompt,
          parentId: parentId || undefined,
          telegramNotify,
          autoReady: !parentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "create failed");
      }
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function runReady() {
    setLoading(true);
    setError("");
    try {
      await fetch("/api/v1/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", provider: "auto", limit: 4 }),
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Module · Hermes Kanban Team
          </div>
          <h1 className="text-2xl font-semibold">Agent Team Board</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
            Parallel agents with parent→child handoff (research → implement →
            report). Same workflow pattern as Hermes dashboards — scoped to{" "}
            <strong className="text-amber-200">authorized defensive work only</strong>.
            SMS spoofing, phishing pages, and covert target tracking are blocked.
          </p>
        </div>
        <button className="lm-btn" onClick={runReady} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run ready tasks
        </button>
      </div>

      {board?.policy ? (
        <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
          {board.policy}
        </div>
      ) : null}

      <div className="lm-panel grid gap-3 rounded-lg p-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] uppercase text-[var(--lm-muted)]">
            Title
          </label>
          <input className="lm-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase text-[var(--lm-muted)]">
            Parent task ID (optional handoff)
          </label>
          <input
            className="lm-input font-mono text-xs"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            placeholder="kb_… leaves child in todo until parent done"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] uppercase text-[var(--lm-muted)]">
            Prompt
          </label>
          <textarea
            className="lm-input min-h-[80px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--lm-muted)]">
          <input
            type="checkbox"
            checked={telegramNotify}
            onChange={(e) => setTelegramNotify(e.target.checked)}
          />
          Telegram notify when done (if bot configured)
        </label>
        <div>
          <button className="lm-btn" onClick={createTask} disabled={loading}>
            <Plus className="h-4 w-4" />
            Add task
          </button>
        </div>
        {error ? <p className="md:col-span-2 text-sm text-rose-300">{error}</p> : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {COLS.map((col) => (
          <div key={col} className="lm-panel min-h-[280px] rounded-lg p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-wider text-cyan-300/80">
                {col.replace("_", " ")}
              </span>
              <span className="lm-badge">
                {board?.columns?.[col]?.length ?? 0}
              </span>
            </div>
            <div className="space-y-2">
              {(board?.columns?.[col] || []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t)}
                  className="w-full rounded border border-[var(--lm-border)] bg-black/30 p-2 text-left text-xs transition hover:border-cyan-400/40"
                >
                  <div className="font-medium text-[var(--lm-text)]">{t.title}</div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--lm-muted)]">
                    {t.kind} · {t.id}
                  </div>
                  {t.parentId ? (
                    <div className="text-[10px] text-amber-200/80">
                      child of {t.parentId.slice(0, 12)}…
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="lm-panel rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium text-cyan-200">{selected.title}</h2>
            <span className="lm-badge">{selected.column}</span>
            <span className="lm-badge">{selected.kind}</span>
            <span className="font-mono text-[11px] text-[var(--lm-muted)]">
              {selected.id}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--lm-muted)]">{selected.prompt}</p>
          {selected.blockedReason ? (
            <p className="mt-2 text-sm text-rose-300">{selected.blockedReason}</p>
          ) : null}
          {selected.result ? (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-[var(--lm-muted)]">
              {selected.result}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
