"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { GlobeCanvas } from "@/components/console/GlobeCanvas";

type Entry = {
  id: string;
  shortId: string;
  ts: string;
  label: string;
  kind: string;
  ip?: string;
  os?: string;
  screen?: string;
  place?: string;
  lat: number;
  lon: number;
  meta?: Record<string, string>;
};

export default function TelemetryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [policy, setPolicy] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/telemetry");
      const data = await res.json();
      setEntries(data.entries || []);
      setPolicy(data.policy || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, []);

  const points = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        lat: e.lat,
        lon: e.lon,
        label: e.place || e.label,
        kind:
          e.kind === "ops"
            ? "ops"
            : e.kind === "scrape"
              ? "infra"
              : e.kind === "osint"
                ? "threat"
                : "sensor",
      })),
    [entries]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Module · Engagement Telemetry
          </div>
          <h1 className="text-2xl font-semibold">Recent Entries · Map</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
            SOTA ops map for authorized mission pins and SOC nodes. Not a covert
            victim-tracking product.
          </p>
        </div>
        <button className="lm-btn" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {policy ? (
        <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90">
          {policy}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="lm-panel relative h-[520px] overflow-hidden rounded-lg">
          <GlobeCanvas points={points} mode="standard" />
        </div>

        <div className="lm-panel max-h-[520px] overflow-auto rounded-lg">
          <div className="sticky top-0 border-b border-[var(--lm-border)] bg-[#0a1220] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-muted)]">
            Recent Entries
          </div>
          <ul className="divide-y divide-[var(--lm-border)]">
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className={`w-full px-3 py-2.5 text-left transition hover:bg-white/[0.03] ${
                    selected?.id === e.id ? "bg-cyan-400/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-2 font-mono text-[12px]">
                    <span className="text-cyan-200/90">#{e.shortId}</span>
                    <span className="text-rose-300/90">{e.ip || "—"}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--lm-muted)]">
                    {e.os || e.kind}
                    {e.screen ? ` · ${e.screen}` : ""} ·{" "}
                    {new Date(e.ts).toISOString()}
                  </div>
                  {e.place ? (
                    <div className="mt-0.5 text-[11px] text-emerald-300/80">
                      {e.place}
                    </div>
                  ) : null}
                  <div className="mt-0.5 truncate text-[11px] text-[var(--lm-text)]">
                    {e.label}
                  </div>
                </button>
              </li>
            ))}
            {!entries.length ? (
              <li className="p-6 text-center text-sm text-[var(--lm-muted)]">
                No entries — run Kanban OSINT/scrape tasks to populate.
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      {selected ? (
        <div className="lm-panel rounded-lg p-4 text-sm">
          <div className="font-mono text-cyan-200">
            #{selected.shortId} · {selected.kind}
          </div>
          <div className="mt-1 text-[var(--lm-muted)]">
            {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)} ·{" "}
            {selected.place || "—"}
          </div>
          <div className="mt-2">{selected.label}</div>
          {selected.meta ? (
            <pre className="mt-2 overflow-auto font-mono text-[11px] text-[var(--lm-muted)]">
              {JSON.stringify(selected.meta, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
