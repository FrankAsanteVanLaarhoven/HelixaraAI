/**
 * Worldview AI — video + physics grounded world model.
 * Maintains world hypotheses, video observations, physics rollouts,
 * and a train/export loop for local fine-tuning.
 */

import { promises as fs } from "fs";
import path from "path";
import { uid } from "@/lib/utils";
import { emitEvent } from "@/modules/events/bus";
import {
  RigidBodyState,
  Vec3,
  motionEnergy,
  projectPinhole,
  simulateScene,
} from "@/modules/worldview/physics";
import { completeLLM } from "@/modules/llm/providers";
import { getPrivacyMode } from "@/modules/os/privacy";

export interface VideoObservation {
  id: string;
  ts: string;
  /** URI, path, or logical name */
  source: string;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  /** Optional brightness time series for motion energy */
  luminanceSamples?: number[];
  /** Operator notes / captions */
  caption?: string;
  tags: string[];
}

export interface WorldEntity {
  id: string;
  label: string;
  kind: "agent" | "vehicle" | "structure" | "sensor" | "unknown";
  position: Vec3;
  velocity: Vec3;
  confidence: number;
  lastSeen: string;
}

export interface WorldSnapshot {
  id: string;
  ts: string;
  frameIndex?: number;
  entities: WorldEntity[];
  physicsBodies: RigidBodyState[];
  /** Consistency score vs physics rollout */
  physicsConsistency: number;
  notes: string;
}

export interface WorldviewEpisode {
  id: string;
  createdAt: string;
  title: string;
  video?: VideoObservation;
  snapshots: WorldSnapshot[];
  narrative?: string;
  /** Labeled for training */
  quality?: "good" | "bad" | "mixed";
  labels?: { ts: string; what: string }[];
}

export interface WorldviewModelWeights {
  version: string;
  trainedAt: string;
  episodeCount: number;
  avgPhysicsConsistency: number;
  /** Prior on motion energy scales */
  motionPrior: { mean: number; std: number };
  /** Entity kind frequencies */
  kindPrior: Record<string, number>;
  notes: string[];
}

const episodes: WorldviewEpisode[] = [];
let weights: WorldviewModelWeights | null = null;

function dataDir() {
  return path.join(process.cwd(), "data", "worldview");
}

async function ensureDir() {
  await fs.mkdir(dataDir(), { recursive: true });
}

export async function loadWorldview() {
  try {
    const raw = await fs.readFile(path.join(dataDir(), "episodes.ndjson"), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    episodes.length = 0;
    for (const l of lines) episodes.push(JSON.parse(l));
  } catch {
    /* empty */
  }
  try {
    weights = JSON.parse(
      await fs.readFile(path.join(dataDir(), "model.json"), "utf8")
    ) as WorldviewModelWeights;
  } catch {
    weights = null;
  }
}

async function appendEpisode(ep: WorldviewEpisode) {
  await ensureDir();
  await fs.appendFile(
    path.join(dataDir(), "episodes.ndjson"),
    JSON.stringify(ep) + "\n",
    "utf8"
  );
}

export function listEpisodes(limit = 50) {
  return episodes.slice(0, limit);
}

export function getEpisode(id: string) {
  return episodes.find((e) => e.id === id);
}

export function getWorldviewModel() {
  return weights;
}

export function worldviewStats() {
  return {
    episodes: episodes.length,
    withVideo: episodes.filter((e) => e.video).length,
    model: weights
      ? {
          version: weights.version,
          trainedAt: weights.trainedAt,
          episodeCount: weights.episodeCount,
          avgPhysicsConsistency: weights.avgPhysicsConsistency,
        }
      : null,
  };
}

/** Ingest a video observation and build an initial world hypothesis */
export async function ingestVideoEpisode(input: {
  title: string;
  source: string;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  luminanceSamples?: number[];
  caption?: string;
  tags?: string[];
  seedEntities?: Omit<WorldEntity, "id" | "lastSeen">[];
}): Promise<WorldviewEpisode> {
  if (!episodes.length && !weights) await loadWorldview();

  const now = new Date().toISOString();
  const video: VideoObservation = {
    id: uid("vid"),
    ts: now,
    source: input.source,
    durationSec: input.durationSec,
    width: input.width ?? 1280,
    height: input.height ?? 720,
    fps: input.fps ?? 30,
    luminanceSamples: input.luminanceSamples,
    caption: input.caption,
    tags: input.tags || ["video"],
  };

  const motion = motionEnergy(input.luminanceSamples || syntheticLuma(24));
  const entities: WorldEntity[] = (input.seedEntities || defaultEntities(motion)).map(
    (e) => ({
      ...e,
      id: uid("ent"),
      lastSeen: now,
    })
  );

  const physicsBodies: RigidBodyState[] = entities.map((e, i) => ({
    id: e.id,
    position: { ...e.position },
    velocity: { ...e.velocity },
    mass: e.kind === "vehicle" ? 1200 : e.kind === "structure" ? 5000 : 80,
    radius: e.kind === "structure" ? 2 : 0.5 + i * 0.05,
  }));

  const rollout = simulateScene(physicsBodies, 1.0, 15);
  const last = rollout[rollout.length - 1]?.bodies || physicsBodies;
  const drift =
    physicsBodies.reduce((acc, b, i) => {
      const d = last[i];
      if (!d) return acc;
      const dx = b.position.x - d.position.x;
      const dy = b.position.y - d.position.y;
      const dz = b.position.z - d.position.z;
      return acc + Math.sqrt(dx * dx + dy * dy + dz * dz);
    }, 0) / (physicsBodies.length || 1);

  // Higher consistency when motion energy aligns with non-zero velocities
  const velMag =
    entities.reduce((a, e) => a + Math.hypot(e.velocity.x, e.velocity.y, e.velocity.z), 0) /
    (entities.length || 1);
  const physicsConsistency = Math.max(
    0.05,
    Math.min(0.98, 0.75 - drift * 0.05 + (motion > 0.01 ? 0.1 : -0.05) + (velMag > 0.1 ? 0.05 : 0))
  );

  const projections = entities
    .map((e) => {
      const p = projectPinhole({
        x: e.position.x,
        y: e.position.y,
        z: Math.max(0.5, e.position.z + 5),
      });
      return p ? { id: e.id, ...p } : null;
    })
    .filter(Boolean);

  const snapshot: WorldSnapshot = {
    id: uid("snap"),
    ts: now,
    frameIndex: 0,
    entities,
    physicsBodies,
    physicsConsistency,
    notes: `motionEnergy=${motion.toFixed(4)}; projections=${projections.length}; gravity rollout 1s`,
  };

  const ep: WorldviewEpisode = {
    id: uid("wv"),
    createdAt: now,
    title: input.title,
    video,
    snapshots: [snapshot],
    narrative: input.caption,
  };

  episodes.unshift(ep);
  if (episodes.length > 500) episodes.length = 500;
  await appendEpisode(ep);

  emitEvent({
    type: "agent.task",
    source: "worldview.ingest",
    severity: "info",
    title: `Worldview episode · ${ep.title}`,
    payload: {
      id: ep.id,
      physicsConsistency,
      entities: entities.length,
      source: video.source,
    },
  });

  return ep;
}

function syntheticLuma(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(0.4 + 0.1 * Math.sin(i / 3) + (i % 5 === 0 ? 0.15 : 0));
  }
  return out;
}

function defaultEntities(motion: number): Omit<WorldEntity, "id" | "lastSeen">[] {
  const speed = Math.min(5, 0.5 + motion * 2);
  return [
    {
      label: "Primary actor",
      kind: "agent",
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: speed * 0.3, y: 0, z: speed * 0.1 },
      confidence: 0.7,
    },
    {
      label: "Support structure",
      kind: "structure",
      position: { x: 3, y: 2, z: -1 },
      velocity: { x: 0, y: 0, z: 0 },
      confidence: 0.85,
    },
    {
      label: "Moving object",
      kind: "vehicle",
      position: { x: -2, y: 0.8, z: 2 },
      velocity: { x: -speed * 0.2, y: 0, z: speed * 0.4 },
      confidence: 0.6,
    },
  ];
}

/** Physics rollout from an episode's latest snapshot */
export function rolloutEpisode(
  episodeId: string,
  seconds = 2
): { t: number; bodies: RigidBodyState[] }[] | null {
  const ep = getEpisode(episodeId);
  if (!ep?.snapshots.length) return null;
  const snap = ep.snapshots[ep.snapshots.length - 1];
  return simulateScene(snap.physicsBodies, seconds, 20);
}

export async function narrateEpisode(episodeId: string): Promise<WorldviewEpisode | null> {
  const ep = getEpisode(episodeId);
  if (!ep) return null;
  const snap = ep.snapshots[ep.snapshots.length - 1];
  const privacy = getPrivacyMode();

  const llm = await completeLLM({
    purpose: "report",
    messages: [
      {
        role: "system",
        content:
          "You are HelixaraAI Worldview. Describe the physical scene from structured entities and physics consistency. Defensive/recon framing only. No weaponized guidance.",
      },
      {
        role: "user",
        content: JSON.stringify({
          title: ep.title,
          video: ep.video
            ? {
                source: ep.video.source,
                durationSec: ep.video.durationSec,
                caption: ep.video.caption,
              }
            : null,
          entities: snap?.entities,
          physicsConsistency: snap?.physicsConsistency,
          notes: snap?.notes,
          privacy,
        }),
      },
    ],
  });

  ep.narrative = llm.content;
  ep.labels = [
    ...(ep.labels || []),
    { ts: new Date().toISOString(), what: "narrative_generated" },
  ];
  await persistAllEpisodes();
  return ep;
}

async function persistAllEpisodes() {
  await ensureDir();
  const body =
    episodes.map((e) => JSON.stringify(e)).join("\n") + (episodes.length ? "\n" : "");
  await fs.writeFile(path.join(dataDir(), "episodes.ndjson"), body, "utf8");
}

export async function labelEpisode(
  episodeId: string,
  quality: "good" | "bad" | "mixed",
  note?: string
) {
  const ep = getEpisode(episodeId);
  if (!ep) return null;
  ep.quality = quality;
  ep.labels = [
    ...(ep.labels || []),
    {
      ts: new Date().toISOString(),
      what: `quality=${quality}${note ? `: ${note}` : ""}`,
    },
  ];
  await persistAllEpisodes();
  return ep;
}

export async function trainWorldviewModel(): Promise<WorldviewModelWeights> {
  if (!episodes.length) await loadWorldview();
  const withSnap = episodes.filter((e) => e.snapshots.length);
  const consistencies = withSnap.map(
    (e) => e.snapshots[e.snapshots.length - 1].physicsConsistency
  );
  const avg =
    consistencies.reduce((a, b) => a + b, 0) / (consistencies.length || 1);

  const motions: number[] = [];
  const kinds: Record<string, number> = {};
  for (const e of withSnap) {
    if (e.video?.luminanceSamples) {
      motions.push(motionEnergy(e.video.luminanceSamples));
    }
    for (const ent of e.snapshots[e.snapshots.length - 1].entities) {
      kinds[ent.kind] = (kinds[ent.kind] || 0) + 1;
    }
  }
  const mean =
    motions.reduce((a, b) => a + b, 0) / (motions.length || 1) || 0.05;
  const variance =
    motions.reduce((a, b) => a + (b - mean) ** 2, 0) / (motions.length || 1);
  const std = Math.sqrt(variance) || 0.02;

  weights = {
    version: `wv-${Date.now().toString(36)}`,
    trainedAt: new Date().toISOString(),
    episodeCount: withSnap.length,
    avgPhysicsConsistency: avg,
    motionPrior: { mean, std },
    kindPrior: kinds,
    notes: [
      "Worldview AI priors from video observations + physics rollouts.",
      "Export JSONL for larger video-language / world-model fine-tunes.",
      "Not a full NeRF/Gaussian splat trainer — geometry adapters are roadmap.",
    ],
  };

  await ensureDir();
  await fs.writeFile(
    path.join(dataDir(), "model.json"),
    JSON.stringify(weights, null, 2),
    "utf8"
  );

  emitEvent({
    type: "agent.task",
    source: "worldview.train",
    severity: "info",
    title: `Worldview model ${weights.version}`,
    payload: { episodeCount: weights.episodeCount, avgPhysicsConsistency: avg },
  });

  return weights;
}

export async function exportWorldviewJsonl() {
  if (!episodes.length) await loadWorldview();
  const lines = episodes.map((e) => {
    const snap = e.snapshots[e.snapshots.length - 1];
    return JSON.stringify({
      id: e.id,
      title: e.title,
      createdAt: e.createdAt,
      quality: e.quality,
      video: e.video
        ? {
            source: e.video.source,
            durationSec: e.video.durationSec,
            fps: e.video.fps,
            caption: e.video.caption,
          }
        : null,
      world: {
        entities: snap?.entities,
        physicsConsistency: snap?.physicsConsistency,
        physicsBodies: snap?.physicsBodies,
      },
      narrative: e.narrative,
      messages: [
        {
          role: "system",
          content:
            "You are HelixaraAI Worldview. Reason about scenes with video + physics consistency.",
        },
        {
          role: "user",
          content: `Video: ${e.video?.source || "n/a"}\nCaption: ${e.video?.caption || e.title}\nEntities: ${JSON.stringify(snap?.entities || [])}`,
        },
        {
          role: "assistant",
          content:
            e.narrative ||
            `Physics consistency ${snap?.physicsConsistency?.toFixed(3)}. Entities: ${(snap?.entities || []).map((x) => x.label).join(", ")}`,
        },
      ],
    });
  });

  await ensureDir();
  const outPath = path.join(dataDir(), `train-${Date.now()}.jsonl`);
  await fs.writeFile(outPath, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  return { path: outPath, count: lines.length };
}
