"use client";

import { useEffect, useState } from "react";
import { GlobeCanvas } from "@/components/console/GlobeCanvas";

type Point = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  kind: string;
  meta?: Record<string, string | number | boolean>;
};

type Layer = {
  id: string;
  name: string;
  description: string;
  points: Point[];
  live: boolean;
};

export default function GlobePage() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [modes, setModes] = useState<string[]>(["standard"]);
  const [mode, setMode] = useState("standard");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [ts, setTs] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/v1/geospatial");
      const data = await res.json();
      if (!alive) return;
      setLayers(data.layers || []);
      setModes(data.modes || ["standard"]);
      setTs(data.generatedAt);
      setEnabled((prev) => {
        const next = { ...prev };
        for (const l of data.layers || []) {
          if (next[l.id] === undefined) next[l.id] = true;
        }
        return next;
      });
    }
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const points = layers
    .filter((l) => enabled[l.id] !== false)
    .flatMap((l) => l.points);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Module · Geospatial 3D/4D Command
          </div>
          <h1 className="text-2xl font-semibold">God&apos;s Eye Console</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
            Multi-layer situational awareness. Demo feeds for satellites, ADS-B,
            AIS, and threat pins — swap adapters for production OpenSky / AIS /
            TLE sources. 4D reconstruction pipeline is on the roadmap.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m}
              className={mode === m ? "lm-btn" : "lm-btn opacity-60"}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lm-panel relative h-[520px] overflow-hidden rounded-lg lg:col-span-3">
          <GlobeCanvas points={points} mode={mode} />
          <div className="absolute bottom-3 right-3 text-[10px] text-[var(--lm-muted)]">
            snap {ts ? new Date(ts).toLocaleTimeString() : "—"} · {points.length}{" "}
            entities
          </div>
        </div>

        <div className="space-y-3">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Layers
            </div>
            <div className="space-y-2">
              {layers.map((l) => (
                <label
                  key={l.id}
                  className="flex cursor-pointer items-start gap-2 rounded border border-transparent px-1 py-1 hover:border-[var(--lm-border)]"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={enabled[l.id] !== false}
                    onChange={(e) =>
                      setEnabled((s) => ({ ...s, [l.id]: e.target.checked }))
                    }
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--lm-text)]">
                      {l.name}
                      {l.live ? (
                        <span className="lm-badge lm-badge-live">live</span>
                      ) : (
                        <span className="lm-badge">static</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--lm-muted)]">
                      {l.description}
                    </div>
                    <div className="text-[10px] text-[var(--lm-muted)]">
                      {l.points.length} points
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="lm-panel max-h-56 overflow-auto rounded-lg p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Entity list
            </div>
            <ul className="space-y-1 text-[11px] text-[var(--lm-muted)]">
              {points.map((p) => (
                <li key={p.id}>
                  <span className="text-cyan-300/80">[{p.kind}]</span> {p.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
