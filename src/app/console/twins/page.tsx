"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Satellite } from "lucide-react";
import { GlobeCanvas } from "@/components/console/GlobeCanvas";
import { cn } from "@/lib/utils";

type Twin = {
  id: string;
  label: string;
  kind: string;
  lat: number;
  lon: number;
  region: string;
  fidelity: string;
  health: string;
  lastSync: string;
  pollIntervalSec: number;
  score: number;
  tags: string[];
  notes?: string;
  bindings: {
    id: string;
    kind: string;
    target: string;
    status: string;
    lastPull?: string;
    detail?: string;
  }[];
  metrics: {
    key: string;
    label: string;
    value: number;
    unit: string;
    ts: string;
  }[];
};

type SyncEvent = {
  id: string;
  ts: string;
  twinId: string;
  mode: string;
  ok: boolean;
  latencyMs: number;
  message: string;
};

export default function TwinsPage() {
  const [twins, setTwins] = useState<Twin[]>([]);
  const [syncLog, setSyncLog] = useState<SyncEvent[]>([]);
  const [fidelityModel, setFidelityModel] = useState<Record<string, unknown> | null>(
    null
  );
  const [runtime, setRuntime] = useState<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<Twin | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState("");

  // create form
  const [label, setLabel] = useState("Digital Twin · New Edge");
  const [lat, setLat] = useState(52.37);
  const [lon, setLon] = useState(4.9);
  const [region, setRegion] = useState("eu");
  const [kind, setKind] = useState("edge");
  const [bindTarget, setBindTarget] = useState("cmdb://eu/new-edge");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/twins");
    const data = await res.json();
    setTwins(data.twins || []);
    setSyncLog(data.syncLog || []);
    setFidelityModel(data.fidelityModel || null);
    setRuntime(data.runtime || null);
    if (selected) {
      const fresh = (data.twins || []).find((t: Twin) => t.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [selected]);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  async function syncOne(id: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/twins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", id }),
      });
      const data = await res.json();
      if (data.twin) setSelected(data.twin);
      await load();
      setMsg(`Synced ${data.twin?.label || id}`);
    } finally {
      setLoading(false);
    }
  }

  async function syncAll() {
    setLoading(true);
    try {
      await fetch("/api/v1/twins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_all" }),
      });
      await load();
      setMsg("All twins synchronized");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/twins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          label,
          lat,
          lon,
          region,
          kind,
          fidelity: "low",
          pollIntervalSec: 20,
          tags: [kind, region],
          bindings: [
            { kind: "cmdb", target: bindTarget, detail: "manual register" },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "create failed");
        return;
      }
      setShowCreate(false);
      setSelected(data.twin);
      await load();
      setMsg(`Created ${data.twin.label}`);
    } finally {
      setLoading(false);
    }
  }

  async function addBinding() {
    if (!selected) return;
    const target = prompt("Binding target (e.g. cloud:region:resource)");
    if (!target) return;
    const bkind = prompt("Kind: cmdb | cloud | ot | agent | manual", "cloud");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/twins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bind",
          id: selected.id,
          kind: bkind || "manual",
          target,
        }),
      });
      const data = await res.json();
      if (data.twin) setSelected(data.twin);
      await load();
    } finally {
      setLoading(false);
    }
  }

  const points = useMemo(
    () =>
      twins.map((t) => ({
        id: t.id,
        lat: t.lat,
        lon: t.lon,
        label: `${t.label} [${t.health}]`,
        kind: "ops" as const,
      })),
    [twins]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Module · Digital Twins (live runtime)
          </div>
          <h1 className="text-2xl font-semibold">Live Digital Twins</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
            SOC and edge node twins with real poll + event-driven sync, fidelity
            levels, CMDB/cloud/OT bindings, metrics, and globe pins — not a
            static JSON blurb.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="lm-btn" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="lm-btn" disabled={loading} onClick={syncAll}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Satellite className="h-4 w-4" />
            )}
            Sync all
          </button>
          <button className="lm-btn" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New twin
          </button>
        </div>
      </div>

      {msg ? (
        <div className="rounded border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">
          {msg}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="lm-badge lm-badge-live">
          runtime {runtime?.started ? "on" : "…"} · {twins.length} twins
        </span>
        <span className="lm-badge">
          sync: {String(fidelityModel?.sync || "event-driven + poll")}
        </span>
        <span className="lm-badge">
          path: {String(fidelityModel?.productionPath || "CMDB / cloud / OT")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lm-panel relative h-[340px] overflow-hidden rounded-lg lg:col-span-3">
          <GlobeCanvas points={points} mode="standard" />
        </div>
        <div className="lm-panel max-h-[340px] overflow-auto rounded-lg p-3 lg:col-span-2">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
            Sync log
          </div>
          <ul className="space-y-1 font-mono text-[10px] text-[var(--lm-muted)]">
            {syncLog.map((s) => (
              <li key={s.id}>
                {new Date(s.ts).toLocaleTimeString()} · {s.mode} ·{" "}
                <span className={s.ok ? "text-emerald-300" : "text-rose-300"}>
                  {s.ok ? "ok" : "fail"}
                </span>{" "}
                · {s.latencyMs}ms · {s.message}
              </li>
            ))}
            {!syncLog.length ? <li>No sync events yet</li> : null}
          </ul>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {twins.map((tw) => (
          <button
            key={tw.id}
            type="button"
            onClick={() => setSelected(tw)}
            className={cn(
              "lm-panel rounded-lg p-4 text-left transition",
              selected?.id === tw.id && "ring-1 ring-cyan-400/40"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-cyan-200">{tw.label}</h3>
              <span
                className={
                  tw.health === "synced"
                    ? "lm-badge lm-badge-live"
                    : tw.health === "degraded" || tw.health === "stale"
                      ? "lm-badge lm-badge-warn"
                      : tw.health === "syncing"
                        ? "lm-badge"
                        : "lm-badge lm-badge-crit"
                }
              >
                {tw.health}
              </span>
            </div>
            <div className="mt-2 font-mono text-xs text-[var(--lm-muted)]">
              {tw.lat.toFixed(4)}, {tw.lon.toFixed(4)}
            </div>
            <div className="mt-1 text-[11px] text-[var(--lm-muted)]">
              fidelity <strong className="text-cyan-200">{tw.fidelity}</strong> ·
              region {tw.region} · score {Math.round(tw.score)} · poll{" "}
              {tw.pollIntervalSec}s
            </div>
            <div className="mt-1 text-[10px] text-[var(--lm-muted)]">
              last sync {tw.lastSync}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {tw.bindings.slice(0, 3).map((b) => (
                <span
                  key={b.id}
                  className={
                    b.status === "ok"
                      ? "lm-badge lm-badge-live"
                      : b.status === "degraded"
                        ? "lm-badge lm-badge-warn"
                        : "lm-badge lm-badge-crit"
                  }
                >
                  {b.kind}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="lm-panel space-y-3 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium text-cyan-200">{selected.label}</h2>
            <span className="lm-badge">{selected.kind}</span>
            <span className="lm-badge lm-badge-live">{selected.health}</span>
            <button
              className="lm-btn ms-auto"
              disabled={loading}
              onClick={() => syncOne(selected.id)}
            >
              Sync now
            </button>
            <button className="lm-btn" onClick={addBinding}>
              Add binding
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {selected.metrics.map((m) => (
              <div
                key={m.key}
                className="rounded border border-[var(--lm-border)] bg-black/20 p-2"
              >
                <div className="text-[10px] uppercase text-[var(--lm-muted)]">
                  {m.label}
                </div>
                <div className="text-xl font-semibold text-cyan-300">
                  {m.value}
                  <span className="text-xs text-[var(--lm-muted)]"> {m.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase text-[var(--lm-muted)]">
              Bindings (CMDB / cloud / OT / agent)
            </div>
            <ul className="space-y-1 text-xs">
              {selected.bindings.map((b) => (
                <li
                  key={b.id}
                  className="rounded border border-[var(--lm-border)] px-2 py-1.5 font-mono"
                >
                  <span className="lm-badge">{b.kind}</span>{" "}
                  <span className="text-[var(--lm-text)]">{b.target}</span>{" "}
                  <span
                    className={
                      b.status === "ok"
                        ? "text-emerald-300"
                        : b.status === "degraded"
                          ? "text-amber-300"
                          : "text-rose-300"
                    }
                  >
                    {b.status}
                  </span>
                  {b.detail ? (
                    <span className="text-[var(--lm-muted)]"> · {b.detail}</span>
                  ) : null}
                  {b.lastPull ? (
                    <div className="text-[10px] text-[var(--lm-muted)]">
                      last pull {b.lastPull}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {fidelityModel ? (
        <div className="lm-panel rounded-lg p-4 text-xs text-[var(--lm-muted)]">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
            Fidelity model (live criteria)
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["low", "medium", "high"] as const).map((lvl) => {
              const c = (
                fidelityModel.criteria as Record<
                  string,
                  { minBindings: number; maxStaleSec: number; minScore: number }
                >
              )?.[lvl];
              return (
                <div
                  key={lvl}
                  className="rounded border border-[var(--lm-border)] p-2"
                >
                  <div className="font-medium text-cyan-200">{lvl}</div>
                  {c ? (
                    <div>
                      min bindings {c.minBindings} · max stale {c.maxStaleSec}s ·
                      min score {c.minScore}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-2">
            levels: {(fidelityModel.levels as string[])?.join(", ")} · sync:{" "}
            {String(fidelityModel.sync)} · production:{" "}
            {String(fidelityModel.productionPath)}
          </div>
        </div>
      ) : null}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="lm-panel w-full max-w-md space-y-2 rounded-lg p-4">
            <div className="text-sm font-medium text-cyan-200">Create twin</div>
            <input
              className="lm-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="lm-input"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                placeholder="lat"
              />
              <input
                type="number"
                className="lm-input"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
                placeholder="lon"
              />
            </div>
            <select
              className="lm-input"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {["eu", "na", "apac", "me", "af", "sa", "oc", "global"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="lm-input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {["soc", "edge", "hub", "ot", "cloud"].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              className="lm-input font-mono text-xs"
              value={bindTarget}
              onChange={(e) => setBindTarget(e.target.value)}
              placeholder="cmdb://..."
            />
            <div className="flex justify-end gap-2">
              <button className="lm-btn" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="lm-btn" disabled={loading} onClick={create}>
                Create + sync
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
