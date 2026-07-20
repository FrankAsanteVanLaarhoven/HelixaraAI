"use client";

import { useEffect, useState } from "react";
import { EthicalGate } from "@/components/console/EthicalGate";
import { Loader2, Radio } from "lucide-react";

export default function RfSimPage() {
  const [policy, setPolicy] = useState("");
  const [jobs, setJobs] = useState<
    { id: string; bssid: string; framesGenerated: number; ts: string; note: string }[]
  >([]);
  const [engagementId, setEngagementId] = useState("ROE-LAB-001");
  const [bssid, setBssid] = useState("AA:BB:CC:DD:EE:01");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState("");

  async function load() {
    const res = await fetch("/api/v1/ethical?section=rf", { cache: "no-store" });
    const data = await res.json();
    setPolicy(data.policy?.message || "");
    setJobs(data.jobs || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function runSim() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ethical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rf.software_sim",
          engagementId,
          bssid,
          count: 16,
          otaInject: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.reason || data.error);
      setLast(
        `Generated ${data.job?.framesGenerated} software frames · WIDS accepted ${data.wids?.accepted ?? 0}`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <EthicalGate title="Deauth / RF inject (software sim only)">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            RF lab
          </div>
          <h1 className="text-2xl font-semibold">Deauth software simulation</h1>
        </div>
        {policy ? (
          <div className="rounded border border-rose-400/30 bg-rose-400/5 p-3 text-xs text-rose-100/90">
            {policy}
          </div>
        ) : null}
        <div className="lm-panel grid gap-3 rounded-lg p-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
              Engagement id
            </label>
            <input
              className="lm-input font-mono"
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--lm-muted)]">
              Lab BSSID
            </label>
            <input
              className="lm-input font-mono"
              value={bssid}
              onChange={(e) => setBssid(e.target.value)}
            />
          </div>
          <button className="lm-btn" disabled={busy} onClick={runSim}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radio className="h-4 w-4" />
            )}
            Inject software events → WIDS
          </button>
        </div>
        {last ? <div className="text-sm text-emerald-300/90">{last}</div> : null}
        {error ? <div className="text-sm text-rose-300">{error}</div> : null}
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id} className="lm-panel rounded-lg p-3 text-sm">
              <div className="font-mono text-cyan-200">
                {j.bssid} · {j.framesGenerated} frames
              </div>
              <div className="text-[11px] text-[var(--lm-muted)]">
                {j.note} · {j.ts}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[var(--lm-muted)]">
          Review detections at <a className="text-cyan-300" href="/console/wids">/console/wids</a>.
        </p>
      </div>
    </EthicalGate>
  );
}
