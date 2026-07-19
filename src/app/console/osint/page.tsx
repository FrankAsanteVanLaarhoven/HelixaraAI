"use client";

import { useState } from "react";
import { FileSearch, Loader2 } from "lucide-react";

type Finding = {
  id: string;
  source: string;
  title: string;
  summary: string;
  confidence: number;
  iocs: string[];
  tags: string[];
};

type Report = {
  queryId: string;
  query: string;
  status: string;
  findings: Finding[];
  darkWeb: { enabled: boolean; reason: string; placeholderHits: number };
  durationMs: number;
};

export default function OsintPage() {
  const [query, setQuery] = useState("example.com");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  async function run() {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/v1/osint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      setReport(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Module · OSINT
        </div>
        <h1 className="text-2xl font-semibold">Ethical Intelligence Fusion</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
          Public-source enrichment: DNS over HTTPS, Certificate Transparency,
          HTTP security posture. Dark-web indexing is{" "}
          <strong className="text-amber-200">authorization-gated</strong> and
          disabled unless ROE scopes are present.
        </p>
      </div>

      <div className="lm-panel flex flex-wrap items-end gap-3 rounded-lg p-4">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
            Domain / entity query
          </label>
          <input
            className="lm-input font-mono"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="lm-btn" onClick={run} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSearch className="h-4 w-4" />
          )}
          Run OSINT
        </button>
      </div>

      {report ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                report.status === "ok" ? "lm-badge lm-badge-live" : "lm-badge lm-badge-warn"
              }
            >
              {report.status}
            </span>
            <span className="text-xs text-[var(--lm-muted)]">
              {report.queryId} · {report.durationMs}ms · {report.findings.length}{" "}
              findings
            </span>
            <span
              className={
                report.darkWeb.enabled ? "lm-badge lm-badge-warn" : "lm-badge"
              }
            >
              dark-web: {report.darkWeb.enabled ? "channel ready" : "locked"}
            </span>
          </div>

          <div className="lm-panel rounded-lg p-3 text-xs text-[var(--lm-muted)]">
            {report.darkWeb.reason}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {report.findings.map((f) => (
              <div key={f.id} className="lm-panel rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-cyan-300/70">
                      {f.source}
                    </div>
                    <h3 className="font-medium text-[var(--lm-text)]">{f.title}</h3>
                  </div>
                  <span className="lm-badge">
                    {Math.round(f.confidence * 100)}% conf
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--lm-muted)]">{f.summary}</p>
                {f.iocs.length ? (
                  <ul className="mt-2 max-h-24 overflow-auto font-mono text-[11px] text-cyan-100/70">
                    {f.iocs.slice(0, 12).map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.tags.map((t) => (
                    <span key={t} className="lm-badge">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
