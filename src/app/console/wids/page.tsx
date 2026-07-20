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

type Device = {
  mac: string;
  role: string;
  deauthRx: number;
  deauthTx: number;
  disassoc: number;
  lastSeen: string;
  bssids: string[];
  risk: string;
};

type TimelineItem = {
  ts: string;
  kind: string;
  summary: string;
  severity?: string;
};

export default function WidsPage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [mitigation, setMitigation] = useState<string[]>([]);
  const [boundaries, setBoundaries] = useState<Record<string, string> | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/wids?limit=50");
      const data = await res.json();
      setStatus(data.status);
      setAlerts(data.alerts || []);
      setDevices(data.devices || []);
      setTimeline(data.timeline || []);
      setMitigation(data.mitigation || data.status?.mitigationPlaybook || []);
      setBoundaries(data.boundaries || null);
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
            Wi‑Fi security auditing · detection & IR only
          </div>
          <h1 className="text-2xl font-semibold">
            Deauth / management-frame monitoring
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
            Alerts, device visibility, event timelines, and defensive mitigation
            guidance.{" "}
            <strong className="text-amber-200">
              No packet injection, deauth TX, or jamming.
            </strong>
          </p>
        </div>
        <button className="lm-btn" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {boundaries ? (
        <div className="rounded border border-rose-400/40 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-50/95 space-y-1">
          <div>
            <strong>(a)</strong> {boundaries.a}
          </div>
          <div>
            <strong>(b)</strong> {boundaries.b}
          </div>
          <div>
            <strong>(c)</strong> {boundaries.c}
          </div>
        </div>
      ) : null}

      {status ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              Product mode
            </div>
            <div className="text-cyan-200">{String(status.mode)}</div>
            <div className="text-[11px] text-emerald-300/90">
              TX: {String(status.transmitsFrames)} · injection/jam: off
            </div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              Frames / alerts
            </div>
            <div className="text-cyan-200">
              {String(status.framesBuffered)} / {String(status.alertCount)}
            </div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              Module
            </div>
            <div className="text-cyan-200">
              {status.enabled ? "enabled" : "disabled"}
            </div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">
              IR posture
            </div>
            <div className="text-[11px] text-[var(--lm-muted)]">
              Detect · alert · guide — never counter-attack
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="lm-panel rounded-lg p-3 xl:col-span-1">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-rose-300/90">
            <ShieldAlert className="h-3.5 w-3.5" />
            Alerts
          </div>
          <ul className="max-h-[420px] space-y-2 overflow-auto">
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
                </div>
                <div className="mt-1 font-medium text-[var(--lm-text)]">
                  {a.title}
                </div>
                <div className="text-[var(--lm-muted)]">{a.detail}</div>
                <div className="mt-1 font-mono text-[10px] text-cyan-200/70">
                  {a.bssid} · n={a.count}
                </div>
                <div className="mt-2 text-[11px] text-emerald-200/85">
                  {a.recommendation}
                </div>
              </li>
            ))}
            {!alerts.length ? (
              <li className="py-8 text-center text-sm text-[var(--lm-muted)]">
                No alerts — run software lab sim at /console/lab-wifi
              </li>
            ) : null}
          </ul>
        </div>

        <div className="lm-panel rounded-lg p-3 xl:col-span-1">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Device visibility
          </div>
          <ul className="max-h-[420px] space-y-1 overflow-auto text-[11px]">
            {devices.map((d) => (
              <li
                key={d.mac + d.role}
                className="rounded border border-[var(--lm-border)] px-2 py-1.5 font-mono"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="text-[var(--lm-text)]">{d.mac}</span>
                  <span className="lm-badge">{d.role}</span>
                  <span
                    className={
                      d.risk === "elevated"
                        ? "lm-badge lm-badge-crit"
                        : d.risk === "watch"
                          ? "lm-badge lm-badge-warn"
                          : "lm-badge"
                    }
                  >
                    {d.risk}
                  </span>
                </div>
                <div className="text-[var(--lm-muted)]">
                  deauthRx {d.deauthRx} · deauthTx {d.deauthTx} · disassoc{" "}
                  {d.disassoc}
                </div>
              </li>
            ))}
            {!devices.length ? (
              <li className="py-6 text-center text-[var(--lm-muted)]">
                No devices in buffer
              </li>
            ) : null}
          </ul>
        </div>

        <div className="lm-panel rounded-lg p-3 xl:col-span-1">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Event timeline
          </div>
          <ul className="max-h-[280px] space-y-1 overflow-auto font-mono text-[10px] text-[var(--lm-muted)]">
            {timeline.map((t, i) => (
              <li key={i} className="border-b border-[var(--lm-border)]/40 py-1">
                <span className="text-cyan-200/70">{t.kind}</span>{" "}
                {new Date(t.ts).toLocaleTimeString()} — {t.summary}
              </li>
            ))}
            {!timeline.length ? (
              <li className="py-6 text-center">No timeline events</li>
            ) : null}
          </ul>

          <div className="mt-4">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-emerald-300/80">
              Mitigation guidance (defensive)
            </div>
            <ul className="space-y-1 text-[11px] text-[var(--lm-muted)]">
              {mitigation.map((m, i) => (
                <li key={i}>· {m}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[var(--lm-muted)]">
        PRD (excludes offensive features):{" "}
        <code className="text-cyan-200/80">docs/PRD_WIFI_SECURITY_MONITORING.md</code>
      </p>
    </div>
  );
}
