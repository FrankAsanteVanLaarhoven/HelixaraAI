"use client";

import { useEffect, useMemo, useState } from "react";
import { EthicalGate } from "@/components/console/EthicalGate";
import { Loader2, Plus } from "lucide-react";

type Card = {
  id: string;
  title: string;
  detail: string;
  column: string;
  redOwner?: string;
  blueOwner?: string;
};

const COLS = [
  "scenario",
  "red_plan",
  "blue_detect",
  "validate",
  "lessons",
  "done",
] as const;

export default function PurplePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [title, setTitle] = useState("New purple exercise");
  const [detail, setDetail] = useState("Red plan vs Blue detection under ROE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [policy, setPolicy] = useState("");

  async function load() {
    const res = await fetch("/api/v1/ethical?section=purple", {
      cache: "no-store",
    });
    const data = await res.json();
    setCards(data.cards || []);
    setPolicy(data.policy?.message || "");
  }

  useEffect(() => {
    load();
  }, []);

  const byCol = useMemo(() => {
    const m: Record<string, Card[]> = {};
    for (const c of COLS) m[c] = [];
    for (const card of cards) {
      (m[card.column] || (m[card.column] = [])).push(card);
    }
    return m;
  }, [cards]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ethical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purple.upsert",
          title,
          detail,
          column: "scenario",
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

  async function move(id: string, column: string) {
    await fetch("/api/v1/ethical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purple.move", id, column }),
    });
    await load();
  }

  return (
    <EthicalGate title="Purple-team board">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Purple
          </div>
          <h1 className="text-2xl font-semibold">Exercise board</h1>
        </div>
        {policy ? (
          <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
            {policy}
          </div>
        ) : null}
        <div className="lm-panel flex flex-wrap items-end gap-3 rounded-lg p-4">
          <input
            className="lm-input min-w-[200px] flex-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="lm-input min-w-[200px] flex-1"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <button className="lm-btn" disabled={busy} onClick={create}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add card
          </button>
        </div>
        {error ? <div className="text-sm text-rose-300">{error}</div> : null}

        <div className="grid gap-3 overflow-x-auto lg:grid-cols-6">
          {COLS.map((col) => (
            <div key={col} className="lm-panel min-w-[160px] rounded-lg p-2">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
                {col.replace(/_/g, " ")}
              </div>
              <div className="space-y-2">
                {(byCol[col] || []).map((card) => (
                  <div
                    key={card.id}
                    className="rounded border border-[var(--lm-border)] bg-black/20 p-2 text-[12px]"
                  >
                    <div className="font-medium">{card.title}</div>
                    <div className="mt-1 text-[var(--lm-muted)]">{card.detail}</div>
                    <select
                      className="lm-input mt-2 py-1 text-[10px]"
                      value={card.column}
                      onChange={(e) => move(card.id, e.target.value)}
                    >
                      {COLS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </EthicalGate>
  );
}
