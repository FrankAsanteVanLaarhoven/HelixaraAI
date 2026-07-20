"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

type Alert = {
  id: string;
  ruleId: string;
  severity: string;
  ts: string;
  title: string;
  detail: string;
  bssid: string;
  count: number;
  recommendation: string;
};

export default function WidsPage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [frames, setFrames] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/wids?limit=50");
      const data = await res.json();
      setStatus(data.status);
      setAlerts(data.alerts || []);
      setFrames(data.frames || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Module · WIDS
          </div>
          <h1 className="text-2xl font-semibold">
            Wireless intrusion detection (deauth)
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
            Detects deauthentication / disassociation flood patterns on{" "}
            <strong className="text-amber-200">authorised monitored networks</strong>.
            Detection only — HelixaraAI never transmits attack frames.
          </p>
        </div>
        <button className="lm-btn" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="rounded border border-rose-400/40 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-50/95">
        <strong>Legal (UK & deploy-locale):</strong> Controlled lab / defensive
        monitoring only. Under the UK <em>Computer Misuse Act 1990</em>,
        unauthorised acts that impair the operation of systems or networks
        (including wireless disruption such as deauth against networks you do
        not own or lack written authority to test) can be criminal. This module
        is a <em>sensor and detector</em>, not an attack tool. Obtain ROE, site
        owner authority, and local counsel before any RF monitoring deployment.
      </div>

      {status ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">Mode</div>
            <div className="text-cyan-200">{String(status.mode)}</div>
            <div className="text-[11px] text-[var(--lm-muted)]">
              TX frames: {String(status.transmitsFrames)}
            </div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              Frames buffered
            </div>
            <div className="text-cyan-200">{String(status.framesBuffered)}</div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              Alerts
            </div>
            <div className="text-cyan-200">{String(status.alertCount)}</div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              Safeguard
            </div>
            <div className="text-[11px] text-emerald-300/90">
              No counter-deauth · audit on ingest
            </div>
          </div>
        </div>
      ) : null}

      {status?.legal ? (
        <p className="text-[11px] text-[var(--lm-muted)]">{String(status.legal)}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lm-panel rounded-lg p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-rose-300/90">
            <ShieldAlert className="h-3.5 w-3.5" />
            Alerts
          </div>
          <ul className="max-h-[480px] space-y-2 overflow-auto">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded border border-[var(--lm-border)] bg-black/25 p-3 text-xs"
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={
                      a.severity === "critical"
                        ? "lm-badge lm-badge-crit"
                        : a.severity === "high"
                          ? "lm-badge lm-badge-warn"
                          : "lm-badge"
                    }
                  >
                    {a.severity}
                  </span>
                  <span className="lm-badge">{a.ruleId}</span>
                  <span className="font-mono text-[10px] text-[var(--lm-muted)]">
                    {new Date(a.ts).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 font-medium text-[var(--lm-text)]">
                  {a.title}
                </div>
                <div className="text-[var(--lm-muted)]">{a.detail}</div>
                <div className="mt-1 font-mono text-[10px] text-cyan-200/70">
                  BSSID {a.bssid} · count {a.count}
                </div>
                <div className="mt-2 text-[11px] text-emerald-200/80">
                  {a.recommendation}
                </div>
              </li>
            ))}
            {!alerts.length ? (
              <li className="py-8 text-center text-sm text-[var(--lm-muted)]">
                No alerts — run a lab sim on /console/lab-wifi or ingest sensor
                frames via POST /api/v1/wids
              </li>
            ) : null}
          </ul>
        </div>

        <div className="lm-panel rounded-lg p-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Recent management frame summaries
          </div>
          <ul className="max-h-[480px] space-y-1 overflow-auto font-mono text-[10px] text-[var(--lm-muted)]">
            {frames.map((f, i) => (
              <li key={String(f.id || i)} className="border-b border-[var(--lm-border)]/50 py-1">
                {String(f.ts)} · {String(f.type)} · tx {String(f.transmitter)} →{" "}
                {String(f.receiver)} · bssid {String(f.bssid)}
              </li>
            ))}
            {!frames.length ? (
              <li className="py-6 text-center text-sm">No frames yet</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
