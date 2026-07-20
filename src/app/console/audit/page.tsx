"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Event = {
  id: string;
  ts: string;
  operatorId: string;
  action: string;
  resource?: string;
  risk?: string;
  allowed: boolean;
  severity: string;
  engagementId?: string;
  details?: Record<string, unknown>;
};

export default function AuditPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/audit?limit=200");
      const data = await res.json();
      setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Audit & ROE
          </div>
          <h1 className="text-2xl font-semibold">Chain of Custody</h1>
        </div>
        <button className="lm-btn" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="lm-panel overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--lm-border)] bg-black/30 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Operator</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-[var(--lm-muted)]"
                  >
                    No events yet — run a scrape, OSINT query, or mission.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[var(--lm-border)]/60 hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-[var(--lm-muted)]">
                      {new Date(e.ts).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-cyan-200">{e.action}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 font-mono text-[11px] text-[var(--lm-muted)]">
                      {e.resource || "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--lm-muted)]">
                      {e.operatorId}
                      {e.engagementId ? (
                        <div className="text-[10px]">{e.engagementId}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className="lm-badge">{e.risk || e.severity}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          e.allowed
                            ? "lm-badge lm-badge-live"
                            : "lm-badge lm-badge-crit"
                        }
                      >
                        {e.allowed ? "allowed" : "denied"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
