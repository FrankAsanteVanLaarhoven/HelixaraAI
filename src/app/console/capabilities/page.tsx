"use client";

import { useEffect, useState } from "react";

type Caps = {
  name: string;
  tagline: string;
  ethics?: string;
  gap?: {
    problem?: string;
    vsFirecrawl?: string[];
    vsMaltego?: string[];
    vsSpiderFoot?: string[];
  };
  modules?: {
    id: string;
    name: string;
    status: string;
    kpis?: string[];
  }[];
  industryBenchmarks?: { area: string; source: string; note: string }[];
  locales?: string[];
};

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<Caps | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/capabilities")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setCaps)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"));
  }, []);

  if (error) {
    return (
      <div className="text-sm text-rose-300">
        Failed to load capabilities: {error}
      </div>
    );
  }

  if (!caps) {
    return (
      <div className="text-sm text-[var(--lm-muted)]">
        Loading capability matrix…
      </div>
    );
  }

  const gapRows: [string, string[]][] = [
    ["vs Firecrawl", caps.gap?.vsFirecrawl || []],
    ["vs Maltego", caps.gap?.vsMaltego || []],
    ["vs SpiderFoot", caps.gap?.vsSpiderFoot || []],
  ];

  const modules = caps.modules || [];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Strategy · Capability Matrix
        </div>
        <h1 className="text-2xl font-semibold">{caps.name}</h1>
        <p className="mt-1 text-sm text-cyan-200/80">{caps.tagline}</p>
      </div>

      {caps.gap?.problem ? (
        <div className="lm-panel rounded-lg p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-amber-300/80">
            Market gap
          </div>
          <p className="text-sm leading-relaxed text-[var(--lm-muted)]">
            {caps.gap.problem}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {gapRows.map(([title, items]) => (
          <div key={title} className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
              {title}
            </div>
            <ul className="space-y-2 text-sm text-[var(--lm-muted)]">
              {(items || []).map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-cyan-400">▸</span>
                  <span>{item}</span>
                </li>
              ))}
              {!items?.length ? (
                <li className="text-[11px]">No items</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <div key={m.id} className="lm-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[var(--lm-text)]">{m.name}</h3>
              <span
                className={
                  m.status?.includes("mvp") || m.status === "production-mvp"
                    ? "lm-badge lm-badge-live"
                    : "lm-badge lm-badge-warn"
                }
              >
                {m.status}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-[var(--lm-muted)]">
              {(m.kpis || []).map((k) => (
                <li key={k}>· {k}</li>
              ))}
            </ul>
          </div>
        ))}
        {!modules.length ? (
          <div className="text-sm text-[var(--lm-muted)]">No modules listed</div>
        ) : null}
      </div>

      {caps.industryBenchmarks?.length ? (
        <div className="lm-panel rounded-lg p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Industry benchmarks
          </div>
          <ul className="space-y-2 text-sm text-[var(--lm-muted)]">
            {caps.industryBenchmarks.map((b) => (
              <li key={b.area}>
                <strong className="text-[var(--lm-text)]">{b.area}</strong> —{" "}
                {b.source}: {b.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {caps.ethics ? (
        <pre className="lm-panel overflow-auto whitespace-pre-wrap rounded-lg p-4 font-mono text-[11px] leading-relaxed text-[var(--lm-muted)]">
          {caps.ethics}
        </pre>
      ) : null}
    </div>
  );
}
