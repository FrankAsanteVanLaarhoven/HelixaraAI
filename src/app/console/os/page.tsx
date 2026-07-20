"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HardDrive,
  Loader2,
  Lock,
  Radio,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PrivacyMode = "vault" | "connected" | "hybrid";

type OsPayload = {
  name: string;
  tagline: string;
  mode: PrivacyMode;
  privacy: {
    modes: Record<
      string,
      { label: string; description: string; providers: string[] }
    >;
    ownership: string;
  };
  memory: {
    notes: { id: string; title: string; body: string; vault: boolean; ts: string }[];
    goals: {
      id: string;
      title: string;
      status: string;
      progress: number;
      notes: string;
    }[];
    personas: { id: string; name: string; role: string; skills: string[] }[];
    skills: { id: string; name: string; description: string; kind: string }[];
    docs: { id: string; title: string; path: string; summary: string }[];
  };
  suggestions: string[];
  ollama: {
    health: { online: boolean; base: string; version?: string; error?: string };
    installed: { name: string; size?: number }[];
    recommend: Record<
      string,
      { models: { name: string; why: string }[]; install: string }
    >;
    defaultModel: string;
  };
  connections: {
    id: string;
    label: string;
    available: boolean;
    defaultModel: string;
    notes: string;
  }[];
  ownership: {
    dataPath: string;
    auditPath: string;
    neverLeavesVault: boolean;
  };
  kanban: { total: number };
};

export default function OsPage() {
  const [data, setData] = useState<OsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState("");
  const [reply, setReply] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [provider, setProvider] = useState("auto");
  const [remember, setRemember] = useState(true);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [goalTitle, setGoalTitle] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/os");
    const json = await res.json();
    setData(json);
    if (!personaId && json.memory?.personas?.[0]?.id) {
      setPersonaId(json.memory.personas[0].id);
    }
  }, [personaId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function setMode(mode: PrivacyMode) {
    setLoading(true);
    try {
      await fetch("/api/v1/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_mode", mode }),
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function sendChat() {
    if (!chat.trim()) return;
    setLoading(true);
    setReply("");
    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chat,
          provider: provider === "auto" ? "auto" : provider,
          personaId: personaId || undefined,
          remember,
        }),
      });
      const json = await res.json();
      setReply(json.content || json.error || "No response");
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!noteTitle.trim()) return;
    await fetch("/api/v1/os", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_note",
        title: noteTitle,
        body: noteBody,
        vault: data?.mode === "vault",
      }),
    });
    setNoteTitle("");
    setNoteBody("");
    await refresh();
  }

  async function addGoal() {
    if (!goalTitle.trim()) return;
    await fetch("/api/v1/os", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert_goal",
        title: goalTitle,
        status: "active",
        progress: 10,
      }),
    });
    setGoalTitle("");
    await refresh();
  }

  const mode = data?.mode || "hybrid";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Helixara OS
          </div>
          <h1 className="text-2xl font-semibold">
            {data?.name || "Helixara OS"}
          </h1>
        </div>
        <div
          className={cn(
            "lm-badge",
            mode === "vault"
              ? "lm-badge-live"
              : mode === "connected"
                ? "lm-badge-warn"
                : "lm-badge"
          )}
        >
          {mode === "vault" ? (
            <>
              <Lock className="mr-1 inline h-3 w-3" /> VAULT
            </>
          ) : mode === "connected" ? (
            <>
              <Radio className="mr-1 inline h-3 w-3" /> CONNECTED
            </>
          ) : (
            <>
              <HardDrive className="mr-1 inline h-3 w-3" /> HYBRID
            </>
          )}
        </div>
      </div>

      {/* Privacy mode switcher */}
      <div className="grid gap-3 md:grid-cols-3">
        {(["vault", "hybrid", "connected"] as PrivacyMode[]).map((m) => {
          const meta = data?.privacy?.modes?.[m];
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={loading}
              className={cn(
                "lm-panel rounded-lg p-4 text-left transition",
                mode === m
                  ? "border-cyan-400/50 ring-1 ring-cyan-400/30"
                  : "opacity-80 hover:opacity-100"
              )}
            >
              <div className="text-sm font-semibold text-cyan-200">
                {meta?.label || m}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--lm-muted)]">
                {meta?.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="lm-panel rounded-lg p-3 text-xs text-[var(--lm-muted)]">
        <Shield className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
        {data?.privacy?.ownership} · data:{" "}
        <code className="text-cyan-200/80">{data?.ownership?.dataPath}</code>
        {data?.ownership?.neverLeavesVault
          ? " · cloud providers blocked"
          : ""}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Chat */}
        <div className="lm-panel space-y-3 rounded-lg p-4 xl:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-medium">Operator chat</span>
            <select
              className="lm-input w-auto text-xs"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
            >
              {(data?.memory?.personas || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="lm-input w-auto text-xs"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="auto">auto</option>
              <option value="ollama-llama31">Ollama local</option>
              <option value="openrouter">OpenRouter</option>
              <option value="openai-chatgpt">ChatGPT</option>
              <option value="hermes-router">Hermes router</option>
              <option value="openclaw">OpenClaw</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] text-[var(--lm-muted)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              remember
            </label>
          </div>
          <textarea
            className="lm-input min-h-[100px]"
            placeholder="Ask Helixara OS (authorized defensive use)…"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
          />
          <button className="lm-btn" disabled={loading} onClick={sendChat}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </button>
          {reply ? (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-[var(--lm-border)] bg-black/30 p-3 font-mono text-[11px] text-[var(--lm-muted)]">
              {reply}
            </pre>
          ) : null}
        </div>

        {/* Connections + Ollama */}
        <div className="space-y-3">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Connections
            </div>
            <ul className="space-y-2">
              {(data?.connections || []).map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="text-[var(--lm-text)]">{c.label}</div>
                    <div className="text-[10px] text-[var(--lm-muted)]">
                      {c.defaultModel}
                    </div>
                  </div>
                  <span
                    className={
                      c.available ? "lm-badge lm-badge-live" : "lm-badge lm-badge-warn"
                    }
                  >
                    {c.available ? "up" : "off"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Ollama local hub
            </div>
            <div className="text-xs text-[var(--lm-muted)]">
              {data?.ollama?.health?.online ? (
                <span className="text-emerald-300">
                  Online · {data.ollama.health.base} · v
                  {data.ollama.health.version || "?"}
                </span>
              ) : (
                <span className="text-amber-200">
                  Offline — install from ollama.com, then{" "}
                  <code>ollama pull llama3.1</code>
                </span>
              )}
            </div>
            <div className="mt-2 text-[10px] uppercase text-[var(--lm-muted)]">
              Installed
            </div>
            <ul className="mt-1 max-h-24 overflow-auto font-mono text-[11px] text-cyan-100/70">
              {(data?.ollama?.installed || []).map((m) => (
                <li key={m.name}>{m.name}</li>
              ))}
              {!data?.ollama?.installed?.length ? (
                <li className="text-[var(--lm-muted)]">none yet</li>
              ) : null}
            </ul>
            <div className="mt-2 text-[10px] uppercase text-[var(--lm-muted)]">
              Balanced recommends
            </div>
            <ul className="mt-1 space-y-1 text-[11px] text-[var(--lm-muted)]">
              {(data?.ollama?.recommend?.balanced?.models || []).map((m) => (
                <li key={m.name}>
                  <code className="text-cyan-200">ollama pull {m.name}</code>
                  <div>{m.why}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Memory grid */}
      <div className="grid gap-3 lg:grid-cols-4">
        <div className="lm-panel rounded-lg p-3 lg:col-span-1">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Goals
          </div>
          <div className="mb-2 flex gap-1">
            <input
              className="lm-input text-xs"
              placeholder="New goal"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
            />
            <button className="lm-btn shrink-0" onClick={addGoal}>
              +
            </button>
          </div>
          <ul className="space-y-2 text-xs">
            {(data?.memory?.goals || []).map((g) => (
              <li key={g.id} className="rounded border border-[var(--lm-border)] p-2">
                <div className="font-medium text-[var(--lm-text)]">{g.title}</div>
                <div className="text-[10px] text-[var(--lm-muted)]">
                  {g.status} · {g.progress}%
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lm-panel rounded-lg p-3 lg:col-span-1">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Personas
          </div>
          <ul className="space-y-2 text-xs">
            {(data?.memory?.personas || []).map((p) => (
              <li key={p.id} className="rounded border border-[var(--lm-border)] p-2">
                <div className="font-medium text-[var(--lm-text)]">{p.name}</div>
                <div className="text-[10px] text-[var(--lm-muted)]">{p.role}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.skills.map((s) => (
                    <span key={s} className="lm-badge">
                      {s}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lm-panel rounded-lg p-3 lg:col-span-1">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Skills
          </div>
          <ul className="space-y-2 text-xs">
            {(data?.memory?.skills || []).map((s) => (
              <li key={s.id} className="rounded border border-[var(--lm-border)] p-2">
                <div className="font-medium text-[var(--lm-text)]">{s.name}</div>
                <div className="text-[10px] text-[var(--lm-muted)]">
                  {s.kind} · {s.description}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lm-panel rounded-lg p-3 lg:col-span-1">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Suggestions
          </div>
          <ul className="space-y-1 text-[11px] text-[var(--lm-muted)]">
            {(data?.suggestions || []).map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
          <div className="mt-3 text-[10px] text-[var(--lm-muted)]">
            Kanban tasks: {data?.kanban?.total ?? 0}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="lm-panel rounded-lg p-4">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
          Memory notes
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input
            className="lm-input text-xs"
            placeholder="Title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <input
            className="lm-input text-xs"
            placeholder="Body"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button className="lm-btn" onClick={addNote}>
            Save note
          </button>
        </div>
        <ul className="max-h-48 space-y-2 overflow-auto text-xs">
          {(data?.memory?.notes || []).map((n) => (
            <li
              key={n.id}
              className="rounded border border-[var(--lm-border)] bg-black/20 p-2"
            >
              <div className="flex gap-2">
                <span className="font-medium text-[var(--lm-text)]">{n.title}</span>
                {n.vault ? (
                  <span className="lm-badge lm-badge-live">vault</span>
                ) : null}
              </div>
              <div className="text-[var(--lm-muted)]">{n.body.slice(0, 200)}</div>
            </li>
          ))}
          {!data?.memory?.notes?.length ? (
            <li className="text-[var(--lm-muted)]">No notes yet</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
