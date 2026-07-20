"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Settings } from "lucide-react";

type Admin = {
  moduleEnabled: boolean;
  labModeEnabled: boolean;
  labAllowlist: string[];
  labSimRateLimitPerHour: number;
  maxFramesPerSim: number;
  widsIngestPerMinute: number;
  hashMacsInUi: boolean;
  updatedAt: string;
  updatedBy: string;
};

export default function WirelessAdminPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [boundaries, setBoundaries] = useState<Record<string, string> | null>(
    null
  );
  const [audit, setAudit] = useState<
    { id: string; ts: string; actor: string; action: string }[]
  >([]);
  const [allowlistText, setAllowlistText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/wireless-admin");
    const data = await res.json();
    setAdmin(data.admin);
    setBoundaries(data.boundaries);
    setAudit(data.audit || []);
    setAllowlistText((data.admin?.labAllowlist || []).join(", "));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/v1/wireless-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, actor: "console-admin" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "save failed");
        return;
      }
      setAdmin(data.admin);
      setAudit(data.audit || []);
      setMsg("Saved · audited");
    } finally {
      setLoading(false);
    }
  }

  if (!admin) {
    return (
      <div className="text-sm text-[var(--lm-muted)]">Loading admin…</div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Admin controls
        </div>
        <h1 className="text-2xl font-semibold">Wi‑Fi monitoring governance</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
          Kill switch, lab mode, allowlists, rate limits. Offensive OTA features
          cannot be enabled — they are not in the product.
        </p>
      </div>

      {boundaries ? (
        <div className="rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100/90 space-y-1">
          <div>(a) {boundaries.a}</div>
          <div>(b) {boundaries.b}</div>
          <div>(c) {boundaries.c}</div>
        </div>
      ) : null}

      <div className="lm-panel grid gap-4 rounded-lg p-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={admin.moduleEnabled}
            onChange={(e) => save({ moduleEnabled: e.target.checked })}
          />
          Module enabled (detection + lab)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={admin.labModeEnabled}
            onChange={(e) => save({ labModeEnabled: e.target.checked })}
          />
          Lab mode (software sim only)
        </label>

        <label className="block text-[11px] text-[var(--lm-muted)]">
          Lab sim rate limit / hour
          <input
            type="number"
            className="lm-input mt-1"
            value={admin.labSimRateLimitPerHour}
            onChange={(e) =>
              setAdmin({
                ...admin,
                labSimRateLimitPerHour: Number(e.target.value),
              })
            }
            onBlur={() =>
              save({ labSimRateLimitPerHour: admin.labSimRateLimitPerHour })
            }
          />
        </label>
        <label className="block text-[11px] text-[var(--lm-muted)]">
          Max frames per sim
          <input
            type="number"
            className="lm-input mt-1"
            value={admin.maxFramesPerSim}
            onChange={(e) =>
              setAdmin({ ...admin, maxFramesPerSim: Number(e.target.value) })
            }
            onBlur={() => save({ maxFramesPerSim: admin.maxFramesPerSim })}
          />
        </label>
        <label className="block text-[11px] text-[var(--lm-muted)] md:col-span-2">
          WIDS ingest events / minute
          <input
            type="number"
            className="lm-input mt-1"
            value={admin.widsIngestPerMinute}
            onChange={(e) =>
              setAdmin({
                ...admin,
                widsIngestPerMinute: Number(e.target.value),
              })
            }
            onBlur={() =>
              save({ widsIngestPerMinute: admin.widsIngestPerMinute })
            }
          />
        </label>
        <label className="block text-[11px] text-[var(--lm-muted)] md:col-span-2">
          Lab BSSID allowlist (comma-separated)
          <input
            className="lm-input mt-1 font-mono"
            value={allowlistText}
            onChange={(e) => setAllowlistText(e.target.value)}
          />
        </label>
        <button
          className="lm-btn"
          disabled={loading}
          onClick={() =>
            save({
              labAllowlist: allowlistText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
          Save allowlist
        </button>
        {msg ? (
          <div className="text-sm text-emerald-300 md:col-span-2">{msg}</div>
        ) : null}
        <div className="text-[10px] text-[var(--lm-muted)] md:col-span-2">
          Last update: {admin.updatedAt} by {admin.updatedBy}
        </div>
      </div>

      <div className="lm-panel rounded-lg p-3">
        <div className="mb-2 text-[10px] uppercase text-[var(--lm-muted)]">
          Permanently excluded (not toggles)
        </div>
        <ul className="text-xs text-[var(--lm-muted)]">
          <li>· Over-the-air packet injection</li>
          <li>· Deauthentication / disassociation transmission</li>
          <li>· RF jamming / intentional interference</li>
        </ul>
      </div>

      <div className="lm-panel rounded-lg p-3">
        <div className="mb-2 text-[10px] uppercase text-[var(--lm-muted)]">
          Admin audit
        </div>
        <ul className="max-h-40 overflow-auto font-mono text-[10px] text-[var(--lm-muted)]">
          {audit.map((a) => (
            <li key={a.id}>
              {a.ts} · {a.actor} · {a.action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
