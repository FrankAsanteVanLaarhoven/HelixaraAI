"use client";

import { useEffect, useState } from "react";
import { EthicalGate } from "@/components/console/EthicalGate";
import { Loader2, Plus } from "lucide-react";

type Tech = {
  id: string;
  name: string;
  tactic: string;
  summary: string;
  helixaraMode: string;
  detection: string;
  mitigation: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  steps: { techniqueId: string; action: string; mode: string }[];
  ethicalNote: string;
};

export default function AttackPage() {
  const [techniques, setTechniques] = useState<Tech[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [policy, setPolicy] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("Authorized tabletop campaign");
  const [engagementId, setEngagementId] = useState("ROE-LAB-001");
  const [objective, setObjective] = useState(
    "Map recon + detection validation under ethical hacking ROE"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/ethical?section=attack", {
      cache: "no-store",
    });
    const data = await res.json();
    setTechniques(data.techniques || []);
    setCampaigns(data.campaigns || []);
    setPolicy(data.policy?.message || "");
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ethical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attack.campaign",
          name,
          engagementId,
          objective,
          techniqueIds: selected,
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
    <EthicalGate title="ATT&CK campaigns (ethical)">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            ATT&CK
          </div>
          <h1 className="text-2xl font-semibold">TTP library & campaign plans</h1>
        </div>
        {policy ? (
          <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
            {policy}
          </div>
        ) : null}

        <div className="lm-panel space-y-3 rounded-lg p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="lm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
            />
            <input
              className="lm-input font-mono"
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
              placeholder="Engagement / ROE id"
            />
            <textarea
              className="lm-input min-h-[60px] md:col-span-2"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
          <button className="lm-btn" disabled={busy || !selected.length} onClick={create}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Build ethical campaign plan
          </button>
          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {techniques.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`lm-panel rounded-lg p-3 text-left transition ${
                selected.includes(t.id) ? "border-cyan-400/50" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-cyan-200">{t.id}</span>
                <span className="lm-badge">{t.helixaraMode}</span>
                <span className="text-[10px] text-[var(--lm-muted)]">{t.tactic}</span>
              </div>
              <div className="mt-1 text-sm font-medium">{t.name}</div>
              <p className="mt-1 text-[11px] text-[var(--lm-muted)]">{t.summary}</p>
              <p className="mt-1 text-[11px] text-[var(--lm-muted)]">
                <strong className="text-[var(--lm-text)]">Detect:</strong> {t.detection}
              </p>
            </button>
          ))}
        </div>

        {campaigns.map((c) => (
          <div key={c.id} className="lm-panel rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              <span className="font-medium">{c.name}</span>
              <span className="lm-badge lm-badge-live">{c.status}</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-200/80">{c.ethicalNote}</p>
            <ul className="mt-2 space-y-1 text-[12px] text-[var(--lm-muted)]">
              {c.steps.map((s) => (
                <li key={s.techniqueId + s.action}>
                  <span className="font-mono text-cyan-200/90">{s.techniqueId}</span>{" "}
                  [{s.mode}] {s.action}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </EthicalGate>
  );
}
