"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Loader2, Play } from "lucide-react";

type Scenario = { id: string; name: string; description: string };
type Catalog = {
  labModeEnabled: boolean;
  moduleEnabled: boolean;
  allowlist: string[];
  rateLimitPerHour: number;
  maxFramesPerSim: number;
  injectModes: Record<string, string>;
  scenarios: Scenario[];
  policy: string;
  excludedOffensive: Record<string, boolean>;
};

export default function LabWifiPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [boundaries, setBoundaries] = useState<Record<string, string> | null>(
    null
  );
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    limit: number;
  } | null>(null);
  const [scenario, setScenario] = useState("sim.deauth.broadcast_burst");
  const [bssid, setBssid] = useState("aa:bb:cc:11:22:01");
  const [clientMac, setClientMac] = useState("3c:22:fb:10:20:30");
  const [count, setCount] = useState(20);
  const [engagementId, setEngagementId] = useState("LAB-BOOKING-001");
  const [legalBasis, setLegalBasis] = useState(
    "Isolated software evaluation / allowlisted lab BSSID under written ROE"
  );
  const [jurisdiction, setJurisdiction] = useState("UK");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<
    { id: string; ruleId: string; severity: string; title: string; detail: string }[]
  >([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/lab-wifi");
    const data = await res.json();
    setCatalog(data.catalog);
    setBoundaries(data.boundaries);
    setRateLimit(data.rateLimit);
    setAlerts(data.recentAlerts || []);
    if (data.catalog?.allowlist?.[0]) setBssid(data.catalog.allowlist[0]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/v1/lab-wifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          bssid,
          clientMac,
          count,
          engagementId,
          legalBasis,
          jurisdiction,
          injectMode: "bus",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "sim failed");
        setResult(data);
      } else {
        setResult(data);
        setAlerts(data.alerts || []);
        if (data.rateLimit) setRateLimit(data.rateLimit);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Lab-only software harness
        </div>
        <h1 className="text-2xl font-semibold">
          Simulate attack events without OTA disruption
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
          Injects <strong className="text-cyan-200">synthetic</strong> deauth /
          disconnect patterns into WIDS for monitoring, alerting, and resilience
          tests.{" "}
          <strong className="text-amber-200">
            Never transmits deauth, injection, or jamming frames.
          </strong>
        </p>
      </div>

      {boundaries ? (
        <div className="rounded border border-rose-400/40 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-50/95 space-y-1">
          <div>
            <strong>(a) Authorised use:</strong> {boundaries.a}
          </div>
          <div>
            <strong>(b) Safeguards:</strong> {boundaries.b}
          </div>
          <div>
            <strong>(c) Legal:</strong> {boundaries.c}
          </div>
        </div>
      ) : null}

      {catalog ? (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span
            className={
              catalog.moduleEnabled
                ? "lm-badge lm-badge-live"
                : "lm-badge lm-badge-crit"
            }
          >
            module {catalog.moduleEnabled ? "on" : "off"}
          </span>
          <span
            className={
              catalog.labModeEnabled
                ? "lm-badge lm-badge-live"
                : "lm-badge lm-badge-crit"
            }
          >
            lab {catalog.labModeEnabled ? "on" : "off"}
          </span>
          <span className="lm-badge">
            rate {rateLimit?.remaining ?? "—"}/{rateLimit?.limit ?? catalog.rateLimitPerHour} /hr
          </span>
          <span className="lm-badge lm-badge-warn">
            OTA injection/deauth/jam: OFF
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lm-panel space-y-3 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
            <FlaskConical className="h-4 w-4" />
            Scenario runner (bus inject only)
          </div>

          <label className="block text-[11px] text-[var(--lm-muted)]">
            Scenario
            <select
              className="lm-input mt-1"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {(catalog?.scenarios || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-[var(--lm-muted)]">
            {catalog?.scenarios.find((s) => s.id === scenario)?.description}
          </p>

          <label className="block text-[11px] text-[var(--lm-muted)]">
            Allowlisted lab BSSID
            <select
              className="lm-input mt-1 font-mono"
              value={bssid}
              onChange={(e) => setBssid(e.target.value)}
            >
              {(catalog?.allowlist || []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] text-[var(--lm-muted)]">
            Client MAC
            <input
              className="lm-input mt-1 font-mono"
              value={clientMac}
              onChange={(e) => setClientMac(e.target.value)}
            />
          </label>

          <label className="block text-[11px] text-[var(--lm-muted)]">
            Synthetic frame count (max {catalog?.maxFramesPerSim ?? 200})
            <input
              type="number"
              className="lm-input mt-1"
              min={1}
              max={catalog?.maxFramesPerSim ?? 200}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>

          <label className="block text-[11px] text-[var(--lm-muted)]">
            Engagement ID
            <input
              className="lm-input mt-1"
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
            />
          </label>
          <label className="block text-[11px] text-[var(--lm-muted)]">
            Legal basis / ROE
            <input
              className="lm-input mt-1"
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
            />
          </label>
          <label className="block text-[11px] text-[var(--lm-muted)]">
            Jurisdiction
            <select
              className="lm-input mt-1"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            >
              <option value="UK">UK</option>
              <option value="EU">EU</option>
              <option value="US">US</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>

          <button className="lm-btn" disabled={loading} onClick={run}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run software sim → WIDS
          </button>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {result ? (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[var(--lm-border)] bg-black/30 p-2 font-mono text-[10px] text-[var(--lm-muted)]">
              {JSON.stringify(
                {
                  runId: result.runId,
                  ok: result.ok,
                  framesGenerated: result.framesGenerated,
                  widsAccepted: result.widsAccepted,
                  alertHint: result.alertHint,
                  rateLimit: result.rateLimit,
                  error: result.error,
                },
                null,
                2
              )}
            </pre>
          ) : null}
        </div>

        <div className="lm-panel rounded-lg p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Resulting WIDS alerts
          </div>
          <ul className="max-h-[480px] space-y-2 overflow-auto text-xs">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded border border-[var(--lm-border)] p-2"
              >
                <span className="lm-badge lm-badge-warn">{a.severity}</span>{" "}
                <span className="lm-badge">{a.ruleId}</span>
                <div className="mt-1 font-medium">{a.title}</div>
                <div className="text-[var(--lm-muted)]">{a.detail}</div>
              </li>
            ))}
            {!alerts.length ? (
              <li className="text-[var(--lm-muted)]">
                No alerts — try a flood scenario (not benign roam)
              </li>
            ) : null}
          </ul>
          <p className="mt-3 text-[11px] text-[var(--lm-muted)]">
            Dashboard:{" "}
            <a className="text-cyan-300 underline" href="/console/wids">
              /console/wids
            </a>{" "}
            · Admin:{" "}
            <a className="text-cyan-300 underline" href="/console/wireless-admin">
              /console/wireless-admin
            </a>
            · PRD:{" "}
            <code className="text-cyan-200/80">
              docs/PRD_WIFI_SECURITY_MONITORING.md
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
