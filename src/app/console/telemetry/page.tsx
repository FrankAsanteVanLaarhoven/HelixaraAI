"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Satellite, Plane, Radio, Globe2 } from "lucide-react";
import { GlobeCanvas, type MapPoint, type MapSkin } from "@/components/console/GlobeCanvas";

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

type Region = { id: string; name: string; lat: number; lon: number; zoom: number };

type LayerPoint = MapPoint & {
  altKm?: number;
  source?: string;
  ts?: string;
  meta?: Record<string, string | number | boolean | undefined>;
};

type TelemetryLive = {
  live?: boolean;
  generatedAt?: string;
  entries: Entry[];
  policy?: string;
  sources?: { id: string; status: string; detail: string }[];
  regions?: Region[];
  counts?: {
    entries: number;
    satellites: number;
    flights: number;
    twins: number;
    airports: number;
    total: number;
  };
  layers?: {
    satellites: LayerPoint[];
    flights: LayerPoint[];
    twins: LayerPoint[];
    airports: LayerPoint[];
    ops: LayerPoint[];
  };
  error?: string;
};

const DEFAULT_REGIONS: Region[] = [
  { id: "global", name: "Global", lat: 18, lon: 8, zoom: 2 },
  { id: "na", name: "North America", lat: 39, lon: -98, zoom: 3 },
  { id: "eu", name: "Europe", lat: 50, lon: 10, zoom: 3 },
  { id: "me", name: "Middle East", lat: 29, lon: 45, zoom: 4 },
  { id: "apac", name: "Asia-Pacific", lat: 20, lon: 105, zoom: 3 },
  { id: "af", name: "Africa", lat: 5, lon: 20, zoom: 3 },
  { id: "sa", name: "South America", lat: -15, lon: -60, zoom: 3 },
  { id: "oc", name: "Oceania", lat: -25, lon: 135, zoom: 3 },
  { id: "arctic", name: "Arctic", lat: 75, lon: 0, zoom: 3 },
  { id: "antarctic", name: "Antarctic", lat: -75, lon: 0, zoom: 3 },
];

export default function TelemetryPage() {
  const [data, setData] = useState<TelemetryLive | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  const [skin, setSkin] = useState<MapSkin>("military");
  const [regionId, setRegionId] = useState("global");
  const [layersOn, setLayersOn] = useState({
    satellites: true,
    flights: true,
    ops: true,
    twins: true,
    airports: false,
  });
  const [tick, setTick] = useState(0);
  const [lastOk, setLastOk] = useState<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/v1/telemetry?live=1", { cache: "no-store" });
      const json = (await res.json()) as TelemetryLive;
      setData(json);
      if (json.live !== false) setLastOk(Date.now());
      setTick((t) => t + 1);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Live activation: refresh fusion often; cache re-propagates sats server-side
    const id = setInterval(() => load(true), 8000);
    return () => clearInterval(id);
  }, [load]);

  // Client clock for live stamp
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const regions = data?.regions?.length ? data.regions : DEFAULT_REGIONS;
  const region = regions.find((r) => r.id === regionId) || regions[0];

  const points: MapPoint[] = useMemo(() => {
    const L = data?.layers;
    if (!L) return [];
    const out: MapPoint[] = [];
    if (layersOn.satellites) {
      for (const p of L.satellites || []) {
        out.push({
          id: p.id,
          lat: p.lat,
          lon: p.lon,
          label: p.label,
          kind: "satellite",
          meta: p.meta,
        });
      }
    }
    if (layersOn.flights) {
      for (const p of L.flights || []) {
        out.push({
          id: p.id,
          lat: p.lat,
          lon: p.lon,
          label: p.label,
          kind: "flight",
          meta: p.meta,
        });
      }
    }
    if (layersOn.ops) {
      for (const p of L.ops || []) {
        out.push({
          id: p.id,
          lat: p.lat,
          lon: p.lon,
          label: p.label,
          kind: p.kind || "ops",
          meta: p.meta,
        });
      }
    }
    if (layersOn.twins) {
      for (const p of L.twins || []) {
        out.push({
          id: p.id,
          lat: p.lat,
          lon: p.lon,
          label: p.label,
          kind: "twin",
          meta: p.meta,
        });
      }
    }
    if (layersOn.airports) {
      for (const p of L.airports || []) {
        out.push({
          id: p.id,
          lat: p.lat,
          lon: p.lon,
          label: p.label,
          kind: "airport",
          meta: p.meta,
        });
      }
    }
    return out;
    // tick forces re-render when live data updates with same structure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layersOn, tick]);

  const entries = data?.entries || [];
  const counts = data?.counts;
  const ageSec =
    lastOk != null ? Math.max(0, Math.floor((now - lastOk) / 1000)) : null;
  const liveOk = data?.live !== false && !data?.error;

  function toggleLayer(key: keyof typeof layersOn) {
    setLayersOn((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Telemetry
          </div>
          <h1 className="text-2xl font-semibold">Telemetry Map</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              liveOk ? "lm-badge lm-badge-live" : "lm-badge lm-badge-warn"
            }
          >
            <span className="hx-live-dot mr-1.5 inline-block" />
            {liveOk ? "LIVE" : "DEGRADED"}
            {ageSec != null ? ` · ${ageSec}s` : ""}
          </span>
          <button className="lm-btn" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["military", "TAC"],
              ["nasa", "EARTH"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={skin === id ? "lm-btn py-1 text-xs" : "lm-btn py-1 text-xs opacity-55"}
              onClick={() => setSkin(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-[var(--lm-border)]" />
        {(
          [
            ["satellites", "SAT", Satellite],
            ["flights", "ADS-B", Plane],
            ["ops", "OPS", Radio],
            ["twins", "TWIN", Globe2],
            ["airports", "HUB", Globe2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            className={
              layersOn[key]
                ? "lm-btn py-1 text-xs"
                : "lm-btn py-1 text-xs opacity-45"
            }
            onClick={() => toggleLayer(key)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span className="font-mono opacity-70">
              {key === "satellites"
                ? counts?.satellites ?? 0
                : key === "flights"
                  ? counts?.flights ?? 0
                  : key === "ops"
                    ? counts?.entries ?? 0
                    : key === "twins"
                      ? counts?.twins ?? 0
                      : counts?.airports ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Region strip — all regions */}
      <div className="flex flex-wrap gap-1">
        {regions.map((r) => (
          <button
            key={r.id}
            type="button"
            className={
              regionId === r.id
                ? "lm-btn py-1 text-[11px]"
                : "lm-btn py-1 text-[11px] opacity-50"
            }
            onClick={() => setRegionId(r.id)}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="lm-panel relative h-[min(72vh,640px)] overflow-hidden rounded-lg">
          <GlobeCanvas
            key={`${skin}-${regionId}`}
            points={points}
            mode="night"
            skin={skin}
            fitMode={regionId === "global" ? "global" : "region"}
            region={
              region
                ? { lat: region.lat, lon: region.lon, zoom: region.zoom }
                : null
            }
            showHud
            liveLabel={
              liveOk
                ? `LIVE · ${points.length} · ${region?.name || "GLOBAL"}`
                : "STANDBY"
            }
          />
        </div>

        <div className="flex max-h-[min(72vh,640px)] flex-col gap-3">
          <div className="lm-panel flex-1 overflow-auto rounded-lg">
            <div className="sticky top-0 border-b border-[var(--lm-border)] bg-[var(--lm-panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-muted)]">
              Ops entries
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
                  No ops entries yet.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="lm-panel max-h-40 overflow-auto rounded-lg p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Feeds
            </div>
            <ul className="space-y-1 font-mono text-[11px] text-[var(--lm-muted)]">
              {(data?.sources || []).map((s) => (
                <li key={s.id} className="flex gap-2">
                  <span
                    className={
                      s.status === "ok"
                        ? "text-emerald-400"
                        : s.status === "degraded"
                          ? "text-amber-400"
                          : "text-rose-400"
                    }
                  >
                    ●
                  </span>
                  <span className="min-w-0 truncate">
                    {s.id}: {s.detail}
                  </span>
                </li>
              ))}
              {!data?.sources?.length ? (
                <li className="text-[var(--lm-muted)]">Acquiring feeds…</li>
              ) : null}
            </ul>
          </div>
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

      {data?.error ? (
        <div className="text-xs text-amber-300/90">Live: {data.error}</div>
      ) : null}
    </div>
  );
}
