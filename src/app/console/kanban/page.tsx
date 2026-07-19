"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  shortId: string;
  title: string;
  prompt: string;
  description: string;
  kind: string;
  column: string;
  parentId?: string;
  childrenIds: string[];
  profile: string;
  skills: string[];
  telegramNotify: boolean;
  comments: { id: string; ts: string; author: string; body: string }[];
  result?: string;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
};

type Board = {
  columns: Record<string, Task[]>;
  total: number;
  profiles: string[];
  policy: string;
};

const COLS: {
  id: string;
  label: string;
  hint: string;
  dot: string;
}[] = [
  {
    id: "triage",
    label: "TRIAGE",
    hint: "Raw ideas — specify before dispatch",
    dot: "bg-purple-400",
  },
  {
    id: "todo",
    label: "TODO",
    hint: "Waiting on dependencies or unassigned",
    dot: "bg-slate-400",
  },
  {
    id: "ready",
    label: "READY",
    hint: "Dependencies satisfied — assign profile to dispatch",
    dot: "bg-yellow-400",
  },
  {
    id: "in_progress",
    label: "IN PROGRESS",
    hint: "Claimed by a worker — in flight",
    dot: "bg-emerald-400",
  },
  {
    id: "blocked",
    label: "BLOCKED",
    hint: "Worker asked for human input",
    dot: "bg-rose-500",
  },
  {
    id: "done",
    label: "DONE",
    hint: "Completed",
    dot: "bg-sky-400",
  },
];

const ACTIONS: { id: string; label: string }[] = [
  { id: "triage", label: "→ TRIAGE" },
  { id: "ready", label: "→ READY" },
  { id: "block", label: "BLOCK" },
  { id: "unblock", label: "UNBLOCK" },
  { id: "complete", label: "COMPLETE" },
  { id: "archive", label: "ARCHIVE" },
];

export default function KanbanPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [profileFilter, setProfileFilter] = useState("all");
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [lanesByProfile, setLanesByProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [comment, setComment] = useState("");

  // create form
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [profile, setProfile] = useState("default");
  const [skills, setSkills] = useState("");
  const [parentId, setParentId] = useState("");
  const [telegramNotify, setTelegramNotify] = useState(true);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "1");
    if (profileFilter !== "all") params.set("profile", profileFilter);
    if (q) params.set("q", q);
    const res = await fetch(`/api/v1/kanban?${params}`);
    const data = await res.json();
    setBoard(data.board);
    setTasks(data.tasks || []);
    if (selected) {
      const fresh = (data.tasks || []).find((t: Task) => t.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [showArchived, profileFilter, q, selected]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "request failed");
      if (data.task) setSelected(data.task);
      await refresh();
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    if (!title.trim() || !prompt.trim()) {
      setError("Title and prompt required");
      return;
    }
    const data = await post({
      title: title.trim(),
      prompt: prompt.trim(),
      profile,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      parentId: parentId || undefined,
      telegramNotify,
      autoReady: !parentId,
      column: parentId ? "todo" : "ready",
    });
    if (data?.task) {
      setShowCreate(false);
      setTitle("");
      setPrompt("");
      setSkills("");
      setParentId("");
    }
  }

  const parentOptions = useMemo(
    () => tasks.filter((t) => t.column !== "archived"),
    [tasks]
  );

  const displayColumns = COLS;

  return (
    <div className="hermes-board -mx-2 space-y-3">
      <style jsx global>{`
        .hermes-board {
          --hb-bg: #0d1410;
          --hb-panel: #141c17;
          --hb-border: #243028;
          --hb-muted: #8a9a8e;
          --hb-text: #e4ebe5;
          --hb-accent: #c9b896;
        }
        .hb-panel {
          background: var(--hb-panel);
          border: 1px solid var(--hb-border);
        }
        .hb-btn {
          background: #e8e0d0;
          color: #1a1f1b;
          border: none;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 0.45rem 0.75rem;
          border-radius: 2px;
          cursor: pointer;
        }
        .hb-btn:hover {
          filter: brightness(1.05);
        }
        .hb-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .hb-btn-ghost {
          background: transparent;
          color: var(--hb-accent);
          border: 1px solid var(--hb-border);
        }
        .hb-input {
          background: #0a100c;
          border: 1px solid var(--hb-border);
          color: var(--hb-text);
          border-radius: 2px;
          padding: 0.4rem 0.6rem;
          font-size: 12px;
          width: 100%;
        }
        .hb-col {
          background: #101812;
          border: 1px solid var(--hb-border);
          min-height: 420px;
        }
        .hb-card {
          background: #0c120e;
          border: 1px solid #2a3830;
          transition: border-color 0.15s;
        }
        .hb-card:hover {
          border-color: #4a6354;
        }
      `}</style>

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--hb-muted)]">
          HelixaraAI · Agent Dashboard
        </div>
        <span className="lm-badge lm-badge-live">{board?.total ?? 0} TASKS</span>
        <div className="ms-auto flex flex-wrap gap-2">
          <button
            className="hb-btn"
            disabled={loading}
            onClick={() => post({ action: "nudge", limit: 4 })}
          >
            {loading ? (
              <Loader2 className="inline h-3 w-3 animate-spin" />
            ) : (
              <Zap className="inline h-3 w-3" />
            )}{" "}
            NUDGE DISPATCHER
          </button>
          <button className="hb-btn hb-btn-ghost" onClick={() => refresh()}>
            <RefreshCw className="inline h-3 w-3" /> REFRESH
          </button>
          <button className="hb-btn" onClick={() => setShowCreate(true)}>
            <Plus className="inline h-3 w-3" /> NEW TASK
          </button>
        </div>
      </div>

      {board?.policy ? (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/85">
          {board.policy}
        </div>
      ) : null}

      {/* Filters */}
      <div className="hb-panel flex flex-wrap items-end gap-3 rounded p-3">
        <div className="min-w-[160px] flex-1">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--hb-muted)]">
            Search
          </div>
          <input
            className="hb-input"
            placeholder="Filter cards…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--hb-muted)]">
            Assignee
          </div>
          <select
            className="hb-input w-auto"
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
          >
            <option value="all">All profiles</option>
            {(board?.profiles || ["default"]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-[var(--hb-muted)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          SHOW ARCHIVED
        </label>
        <label className="flex items-center gap-2 text-[11px] text-[var(--hb-muted)]">
          <input
            type="checkbox"
            checked={lanesByProfile}
            onChange={(e) => setLanesByProfile(e.target.checked)}
          />
          LANES BY PROFILE
        </label>
        <button
          className="hb-btn hb-btn-ghost"
          onClick={() => {
            setQ("");
            setProfileFilter("all");
          }}
        >
          CLEAR FILTERS
        </button>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {/* Board + drawer */}
      <div className="grid gap-3 xl:grid-cols-[1fr_340px]">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayColumns.map((col) => {
            const list = board?.columns?.[col.id] || [];
            return (
              <div
                key={col.id}
                className="hb-col w-[240px] shrink-0 rounded p-2"
              >
                <div className="mb-2 flex items-start justify-between gap-2 px-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[var(--hb-text)]">
                      <span
                        className={cn("h-2 w-2 rounded-full", col.dot)}
                      />
                      {col.label}
                    </div>
                    <div className="mt-0.5 text-[9px] uppercase leading-tight tracking-wide text-[var(--hb-muted)]">
                      {col.hint}
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--hb-muted)]">
                    {list.length}
                  </span>
                </div>

                {lanesByProfile ? (
                  groupByProfile(list).map(([prof, items]) => (
                    <div key={prof} className="mb-2">
                      {items.length > 0 ? (
                        <div className="mb-1 px-1 text-[9px] uppercase tracking-wider text-[var(--hb-muted)]">
                          {prof}
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        {items.map((t) => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            active={selected?.id === t.id}
                            onClick={() => setSelected(t)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    {list.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        active={selected?.id === t.id}
                        onClick={() => setSelected(t)}
                      />
                    ))}
                  </div>
                )}

                {!list.length ? (
                  <div className="px-2 py-8 text-center text-[10px] uppercase tracking-wider text-[var(--hb-muted)]">
                    — NO TASKS —
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Detail drawer */}
        <div className="hb-panel sticky top-20 h-fit max-h-[80vh] overflow-y-auto rounded p-3">
          {selected ? (
            <>
              <div className="mb-3 flex flex-wrap gap-1">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    className="hb-btn"
                    disabled={loading}
                    onClick={() =>
                      post({
                        action: "action",
                        id: selected.id,
                        taskAction: a.id,
                      })
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--hb-muted)]">
                  Notify home channels
                </div>
                <button
                  className={cn(
                    "hb-btn",
                    selected.telegramNotify ? "" : "hb-btn-ghost opacity-60"
                  )}
                  onClick={() =>
                    post({
                      action: "update",
                      id: selected.id,
                      telegramNotify: !selected.telegramNotify,
                    })
                  }
                >
                  telegram {selected.telegramNotify ? "ON" : "OFF"}
                </button>
              </div>

              <div className="mb-1 text-[10px] font-mono text-[var(--hb-accent)]">
                T_{selected.shortId}
              </div>
              <h2 className="text-sm font-semibold leading-snug text-[var(--hb-text)]">
                {selected.title}
              </h2>
              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-[var(--hb-muted)]">
                <span className="uppercase">@{selected.profile}</span>
                <span>· {selected.kind}</span>
                <span>· {selected.column}</span>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--hb-muted)]">
                  Description / prompt
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--hb-muted)]">
                  {selected.prompt}
                </p>
                {selected.description ? (
                  <p className="mt-2 text-xs text-[var(--hb-muted)]">
                    {selected.description}
                  </p>
                ) : null}
              </div>

              {selected.blockedReason ? (
                <p className="mt-2 text-xs text-rose-300">
                  {selected.blockedReason}
                </p>
              ) : null}

              {selected.result ? (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[var(--hb-border)] bg-black/30 p-2 font-mono text-[10px] text-[var(--hb-muted)]">
                  {selected.result}
                </pre>
              ) : null}

              <div className="mt-4">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--hb-muted)]">
                  Dependencies
                </div>
                <div className="text-[11px] text-[var(--hb-muted)]">
                  PARENT:{" "}
                  {selected.parentId
                    ? tasks.find((t) => t.id === selected.parentId)?.shortId ||
                      selected.parentId.slice(0, 12)
                    : "NONE"}
                </div>
                <div className="mt-1 text-[11px] text-[var(--hb-muted)]">
                  CHILDREN:{" "}
                  {selected.childrenIds.length
                    ? selected.childrenIds
                        .map(
                          (id) =>
                            tasks.find((t) => t.id === id)?.shortId || id.slice(0, 8)
                        )
                        .join(", ")
                    : "NONE"}
                </div>
                <select
                  className="hb-input mt-2"
                  value={selected.parentId || ""}
                  onChange={(e) =>
                    post({
                      action: "update",
                      id: selected.id,
                      parentId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">— add parent —</option>
                  {parentOptions
                    .filter((t) => t.id !== selected.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        T_{t.shortId} · {t.title.slice(0, 40)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-4">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--hb-muted)]">
                  Comments
                </div>
                <div className="mb-2 max-h-28 space-y-1 overflow-auto">
                  {selected.comments?.map((c) => (
                    <div
                      key={c.id}
                      className="rounded border border-[var(--hb-border)] p-1.5 text-[10px] text-[var(--hb-muted)]"
                    >
                      <span className="text-[var(--hb-accent)]">{c.author}</span>{" "}
                      · {new Date(c.ts).toLocaleString()}
                      <div>{c.body}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="hb-input"
                    placeholder="Add a comment… (Enter to submit)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && comment.trim()) {
                        post({
                          action: "comment",
                          id: selected.id,
                          body: comment,
                        });
                        setComment("");
                      }
                    }}
                  />
                  <button
                    className="hb-btn shrink-0"
                    onClick={() => {
                      if (!comment.trim()) return;
                      post({
                        action: "comment",
                        id: selected.id,
                        body: comment,
                      });
                      setComment("");
                    }}
                  >
                    COMMENT
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-[11px] uppercase tracking-wider text-[var(--hb-muted)]">
              Select a card
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="hb-panel w-full max-w-lg rounded p-4 shadow-2xl">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-accent)]">
              New task
            </div>
            <div className="space-y-2">
              <input
                className="hb-input"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="hb-input min-h-[100px]"
                placeholder="Task prompt / description (authorized ROE only)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[10px] uppercase text-[var(--hb-muted)]">
                    Profile
                  </div>
                  <select
                    className="hb-input"
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                  >
                    {(board?.profiles || ["default"]).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase text-[var(--hb-muted)]">
                    Skills (comma-separated)
                  </div>
                  <input
                    className="hb-input"
                    placeholder="osint, scrape…"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[var(--hb-muted)]">
                  Parent
                </div>
                <select
                  className="hb-input"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">— no parent —</option>
                  {parentOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      T_{t.shortId} · {t.title.slice(0, 50)}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-[var(--hb-muted)]">
                <input
                  type="checkbox"
                  checked={telegramNotify}
                  onChange={(e) => setTelegramNotify(e.target.checked)}
                />
                Notify Telegram on progress
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="hb-btn hb-btn-ghost"
                onClick={() => setShowCreate(false)}
              >
                CANCEL
              </button>
              <button className="hb-btn" disabled={loading} onClick={createTask}>
                CREATE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  active,
  onClick,
}: {
  task: Task;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hb-card w-full rounded p-2 text-left",
        active && "ring-1 ring-[var(--hb-accent)]"
      )}
    >
      <div className="font-mono text-[9px] text-[var(--hb-accent)]">
        T_{task.shortId}
        {task.parentId ? " · 0/1" : ""}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase leading-snug tracking-wide text-[var(--hb-text)]">
        {task.title}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[9px] text-[var(--hb-muted)]">
        <span className="uppercase">@{task.profile}</span>
        {task.skills?.slice(0, 2).map((s) => (
          <span key={s} className="rounded border border-[var(--hb-border)] px-1">
            {s}
          </span>
        ))}
        <span className="ms-auto">
          {relTime(task.updatedAt)}
        </span>
      </div>
    </button>
  );
}

function groupByProfile(list: Task[]): [string, Task[]][] {
  const m = new Map<string, Task[]>();
  for (const t of list) {
    const p = t.profile || "default";
    if (!m.has(p)) m.set(p, []);
    m.get(p)!.push(t);
  }
  if (!m.size) return [["default", []]];
  return Array.from(m.entries());
}

function relTime(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return "JUST NOW";
  if (s < 3600) return `${Math.floor(s / 60)}M AGO`;
  if (s < 86400) return `${Math.floor(s / 3600)}H AGO`;
  return `${Math.floor(s / 86400)}D AGO`;
}
