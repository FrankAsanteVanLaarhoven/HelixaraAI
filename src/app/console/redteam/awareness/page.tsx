"use client";

import { useEffect, useState } from "react";
import { EthicalGate } from "@/components/console/EthicalGate";
import { Loader2, Plus } from "lucide-react";

type Template = {
  id: string;
  channel: string;
  name: string;
  body: string;
  learningObjectives: string[];
};

type Exercise = {
  id: string;
  title: string;
  previewHtml: string;
  warnings: string[];
  status: string;
};

export default function AwarenessPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("Internal awareness drill");
  const [audience, setAudience] = useState("Authorized employees · training cohort A");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/ethical?section=awareness", {
      cache: "no-store",
    });
    const data = await res.json();
    setTemplates(data.templates || []);
    setExercises(data.exercises || []);
    setMessages(data.policy?.messages || []);
    if (!templateId && data.templates?.[0]?.id) {
      setTemplateId(data.templates[0].id);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ethical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "awareness.create",
          templateId,
          title,
          audienceNote: audience,
          liveSend: false,
          spoofSender: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.reason || data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <EthicalGate title="Phishing / SMS awareness (ethical sim)">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Awareness
          </div>
          <h1 className="text-2xl font-semibold">Phishing & SMS simulation</h1>
        </div>
        {messages.map((m) => (
          <div
            key={m}
            className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90"
          >
            {m}
          </div>
        ))}
        <div className="lm-panel grid gap-3 rounded-lg p-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
              Template
            </label>
            <select
              className="lm-input"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.channel} · {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
              Title
            </label>
            <input
              className="lm-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
              Audience note
            </label>
            <input
              className="lm-input"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
          <button className="lm-btn" disabled={busy} onClick={create}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create SIM preview (no send)
          </button>
        </div>
        {error ? <div className="text-sm text-rose-300">{error}</div> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="lm-panel rounded-lg p-4 text-sm">
              <div className="lm-badge">{t.channel}</div>
              <div className="mt-2 font-medium">{t.name}</div>
              <p className="mt-1 text-[var(--lm-muted)]">{t.body}</p>
              <ul className="mt-2 list-inside list-disc text-[11px] text-[var(--lm-muted)]">
                {t.learningObjectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {exercises.map((ex) => (
          <div key={ex.id} className="lm-panel rounded-lg p-4">
            <div className="font-medium">{ex.title}</div>
            <div
              className="mt-2"
              dangerouslySetInnerHTML={{ __html: ex.previewHtml }}
            />
            <ul className="mt-2 text-[11px] text-amber-200/80">
              {ex.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </EthicalGate>
  );
}
