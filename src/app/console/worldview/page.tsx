"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Loader2, Orbit, Play, RefreshCw } from "lucide-react";

type Episode = {
  id: string;
  createdAt: string;
  title: string;
  video?: {
    source: string;
    durationSec?: number;
    caption?: string;
    fps?: number;
  };
  snapshots: {
    physicsConsistency: number;
    entities: {
      id: string;
      label: string;
      kind: string;
      position: { x: number; y: number; z: number };
      velocity: { x: number; y: number; z: number };
      confidence: number;
    }[];
    notes: string;
  }[];
  narrative?: string;
  quality?: string;
};

export default function WorldviewPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [model, setModel] = useState<Record<string, unknown> | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selected, setSelected] = useState<Episode | null>(null);
  const [rollout, setRollout] = useState<
    { t: number; bodies: { id: string; position: { x: number; y: number; z: number } }[] }[]
  >([]);
  const [title, setTitle] = useState("Range recon clip");
  const [source, setSource] = useState("lab://camera-01/clip-demo.mp4");
  const [caption, setCaption] = useState(
    "Two movers near a structure; light motion in frame"
  );
  const [durationSec, setDurationSec] = useState(12);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/worldview");
    const data = await res.json();
    setStats(data.stats);
    setModel(data.model);
    setEpisodes(data.episodes || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function ingest() {
    setLoading(true);
    setMsg("");
    try {
      // synthetic luminance for motion energy demo
      const luminanceSamples = Array.from({ length: 30 }, (_, i) =>
        0.35 + 0.12 * Math.sin(i / 2.5) + (i % 7 === 0 ? 0.2 : 0)
      );
      const res = await fetch("/api/v1/worldview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ingest",
          title,
          source,
          caption,
          durationSec,
          fps: 30,
          width: 1280,
          height: 720,
          luminanceSamples,
          tags: ["video", "physics", "worldview"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "ingest failed");
        return;
      }
      setSelected(data.episode);
      setMsg(`Episode ${data.episode.id} · physics consistency stored`);
      await load();
      await doRollout(data.episode.id);
    } finally {
      setLoading(false);
    }
  }

  async function doRollout(id: string) {
    const res = await fetch("/api/v1/worldview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rollout", episodeId: id, seconds: 2 }),
    });
    const data = await res.json();
    if (data.rollout) setRollout(data.rollout);
  }

  async function narrate() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/worldview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "narrate", episodeId: selected.id }),
      });
      const data = await res.json();
      if (data.episode) setSelected(data.episode);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function label(quality: "good" | "bad" | "mixed") {
    if (!selected) return;
    const res = await fetch("/api/v1/worldview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "label",
        episodeId: selected.id,
        quality,
        note: "operator feedback",
      }),
    });
    const data = await res.json();
    if (data.episode) setSelected(data.episode);
    await load();
    setMsg(`Labeled ${quality}`);
  }

  async function train() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/worldview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "train" }),
      });
      const data = await res.json();
      setModel(data.model);
      setStats(data.stats);
      setMsg(`Trained ${data.model?.version}`);
    } finally {
      setLoading(false);
    }
  }

  async function exportJsonl() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/worldview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export" }),
      });
      const data = await res.json();
      setMsg(`Exported ${data.count} episodes → ${data.path}`);
    } finally {
      setLoading(false);
    }
  }

  const snap = selected?.snapshots?.[selected.snapshots.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Worldview AI · video + physics
          </div>
          <h1 className="text-2xl font-semibold">World model studio</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--lm-muted)]">
            Build our own world-model stack: ingest video observations, ground
            them in classical physics rollouts, narrate scenes, label quality,
            train local priors, export JSONL for larger video/physics fine-tunes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="lm-btn" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="lm-btn" disabled={loading} onClick={train}>
            <Orbit className="h-4 w-4" />
            Train
          </button>
          <button className="lm-btn lm-btn-amber" disabled={loading} onClick={exportJsonl}>
            Export JSONL
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card label="Episodes" value={String(stats?.episodes ?? "—")} />
        <Card label="With video" value={String(stats?.withVideo ?? "—")} />
        <Card
          label="Model"
          value={
            model
              ? String((model as { version?: string }).version || "ready")
              : "untrained"
          }
        />
      </div>

      {msg ? (
        <div className="rounded border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lm-panel space-y-3 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
            <Box className="h-4 w-4" />
            Ingest video observation
          </div>
          <input
            className="lm-input text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <input
            className="lm-input font-mono text-xs"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="file path / URI / logical camera id"
          />
          <textarea
            className="lm-input min-h-[70px] text-sm"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption / scene notes"
          />
          <label className="block text-[11px] text-[var(--lm-muted)]">
            Duration (sec)
            <input
              type="number"
              className="lm-input mt-1"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
            />
          </label>
          <button className="lm-btn" disabled={loading} onClick={ingest}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Ingest + physics ground
          </button>
          <p className="text-[11px] text-[var(--lm-muted)]">
            MVP accepts logical video sources + optional luminance samples for
            motion energy. Full decode pipelines (ffmpeg / CV) are the next
            adapter layer.
          </p>
        </div>

        <div className="lm-panel space-y-3 rounded-lg p-4">
          <div className="text-sm font-medium text-cyan-200">Episodes</div>
          <ul className="max-h-56 space-y-1 overflow-auto text-[11px]">
            {episodes.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`w-full rounded border px-2 py-1.5 text-left ${
                    selected?.id === e.id
                      ? "border-cyan-400/50 bg-cyan-400/10"
                      : "border-[var(--lm-border)]"
                  }`}
                  onClick={() => {
                    setSelected(e);
                    doRollout(e.id);
                  }}
                >
                  <span className="font-mono text-cyan-200/90">{e.id}</span>{" "}
                  {e.quality ? (
                    <span className="lm-badge">{e.quality}</span>
                  ) : null}
                  <div className="text-[var(--lm-text)]">{e.title}</div>
                  <div className="text-[var(--lm-muted)]">
                    {e.video?.source} ·{" "}
                    {e.snapshots?.[0]
                      ? `φ=${e.snapshots[0].physicsConsistency.toFixed(2)}`
                      : ""}
                  </div>
                </button>
              </li>
            ))}
            {!episodes.length ? (
              <li className="text-[var(--lm-muted)]">No episodes yet</li>
            ) : null}
          </ul>
        </div>
      </div>

      {selected && snap ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 flex flex-wrap gap-2">
              <button className="lm-btn" disabled={loading} onClick={narrate}>
                Narrate (LLM + physics)
              </button>
              <button className="lm-btn" onClick={() => label("good")}>
                Label good
              </button>
              <button className="lm-btn lm-btn-amber" onClick={() => label("mixed")}>
                Mixed
              </button>
              <button
                className="lm-btn"
                style={{ color: "#ff4d6a", borderColor: "rgba(255,77,106,0.45)" }}
                onClick={() => label("bad")}
              >
                Label bad
              </button>
            </div>
            <div className="font-mono text-[10px] text-cyan-200">
              {selected.id} · {selected.createdAt}
            </div>
            <div className="mt-1 text-sm font-medium">{selected.title}</div>
            <div className="text-[11px] text-[var(--lm-muted)]">
              Physics consistency:{" "}
              <strong className="text-cyan-200">
                {snap.physicsConsistency.toFixed(3)}
              </strong>
            </div>
            <div className="mt-2 text-[11px] text-[var(--lm-muted)]">{snap.notes}</div>
            <div className="mt-3 text-[10px] uppercase text-cyan-300/80">
              Entities
            </div>
            <ul className="mt-1 space-y-1 font-mono text-[10px] text-[var(--lm-muted)]">
              {snap.entities.map((e) => (
                <li key={e.id}>
                  [{e.kind}] {e.label} @ (
                  {e.position.x.toFixed(2)}, {e.position.y.toFixed(2)},{" "}
                  {e.position.z.toFixed(2)}) v=
                  {Math.hypot(e.velocity.x, e.velocity.y, e.velocity.z).toFixed(2)}{" "}
                  conf={e.confidence.toFixed(2)}
                </li>
              ))}
            </ul>
            {selected.narrative ? (
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-[var(--lm-muted)]">
                {selected.narrative}
              </pre>
            ) : null}
          </div>

          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/80">
              Physics rollout (2s)
            </div>
            <div className="relative h-64 overflow-hidden rounded border border-[var(--lm-border)] bg-[#050a08]">
              <svg viewBox="-6 -1 12 8" className="h-full w-full">
                <line
                  x1="-6"
                  y1="0"
                  x2="6"
                  y2="0"
                  stroke="#1a2d4a"
                  strokeWidth="0.05"
                />
                {rollout
                  .filter((_, i) => i % 3 === 0)
                  .map((frame, fi) =>
                    frame.bodies.map((b, bi) => (
                      <circle
                        key={`${fi}-${bi}`}
                        cx={b.position.x}
                        cy={-b.position.y}
                        r={0.15 + bi * 0.05}
                        fill={
                          bi === 0
                            ? "#2ee6ff"
                            : bi === 1
                              ? "#f5b942"
                              : "#3dff9a"
                        }
                        opacity={0.35 + (fi / (rollout.length || 1)) * 0.6}
                      />
                    ))
                  )}
              </svg>
            </div>
            <p className="mt-2 text-[11px] text-[var(--lm-muted)]">
              Gravity + elastic collisions · y-up · ground contact. Used as
              inductive bias for worldview consistency scoring.
            </p>
          </div>
        </div>
      ) : null}

      {model ? (
        <pre className="lm-panel max-h-48 overflow-auto rounded-lg p-3 font-mono text-[10px] text-[var(--lm-muted)]">
          {JSON.stringify(model, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="lm-panel rounded-lg p-3">
      <div className="text-[10px] uppercase text-[var(--lm-muted)]">{label}</div>
      <div className="text-xl font-semibold text-cyan-300">{value}</div>
    </div>
  );
}
