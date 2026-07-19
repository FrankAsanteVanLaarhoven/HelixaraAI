/**
 * Authorized engagement telemetry — map + recent entries panel.
 * SOTA UI pattern inspired by Hermes admin logs; data is ROE/ops scoped only.
 */

import { uid } from "@/lib/utils";
import type { KanbanTask } from "@/modules/agents/kanban";

export interface TelemetryEntry {
  id: string;
  shortId: string;
  ts: string;
  /** Public-facing label (site title, mission name) */
  label: string;
  kind: "osint" | "scrape" | "agent" | "ops" | "manual";
  /** Simulated / resolved network context for lab demos */
  ip?: string;
  os?: string;
  screen?: string;
  place?: string;
  lat: number;
  lon: number;
  meta?: Record<string, string>;
}

const entries: TelemetryEntry[] = [];
const MAX = 200;

/** Seed a few authorized ops pins so the map is never empty */
function seedIfEmpty() {
  if (entries.length) return;
  const now = Date.now();
  const seeds: Omit<TelemetryEntry, "id" | "shortId">[] = [
    {
      ts: new Date(now - 3600_000).toISOString(),
      label: "HelixaraAI Node · London SOC",
      kind: "ops",
      ip: "ops-edge",
      os: "linux",
      screen: "ops-twin",
      place: "London, UK",
      lat: 51.5074,
      lon: -0.1278,
    },
    {
      ts: new Date(now - 7200_000).toISOString(),
      label: "HelixaraAI Node · Dublin Edge",
      kind: "ops",
      ip: "ops-edge",
      os: "linux",
      place: "Dublin, IE",
      lat: 53.3498,
      lon: -6.2603,
    },
    {
      ts: new Date(now - 1800_000).toISOString(),
      label: "HelixaraAI Node · Cork Lab",
      kind: "ops",
      place: "Cork, IE",
      lat: 51.8985,
      lon: -8.4756,
    },
  ];
  for (const s of seeds) {
    entries.push({
      id: uid("tel"),
      shortId: uid("e").slice(-8),
      ...s,
    });
  }
}

seedIfEmpty();

const PLACE_POOL = [
  { place: "London, UK", lat: 51.5074, lon: -0.1278 },
  { place: "Dublin, IE", lat: 53.3498, lon: -6.2603 },
  { place: "Amsterdam, NL", lat: 52.3676, lon: 4.9041 },
  { place: "Frankfurt, DE", lat: 50.1109, lon: 8.6821 },
  { place: "New York, US", lat: 40.7128, lon: -74.006 },
  { place: "Singapore", lat: 1.3521, lon: 103.8198 },
];

function hashPick(s: string, n: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

export function recordTelemetryFromTask(
  task: KanbanTask,
  info: { label: string; kind: TelemetryEntry["kind"] }
) {
  const place = PLACE_POOL[hashPick(task.id + info.label, PLACE_POOL.length)];
  const jitter = (hashPick(task.id, 100) - 50) / 500;
  const entry: TelemetryEntry = {
    id: uid("tel"),
    shortId: task.shortId.toLowerCase(),
    ts: new Date().toISOString(),
    label: info.label.slice(0, 120),
    kind: info.kind,
    ip: `lab-${hashPick(task.id, 200) + 10}.${hashPick(task.title, 200)}.0.${hashPick(info.label, 200)}`,
    os: task.profile === "default" ? "helixara-agent" : `profile-${task.profile}`,
    screen: "mission-console",
    place: place.place,
    lat: place.lat + jitter,
    lon: place.lon + jitter,
    meta: {
      taskId: task.id,
      kind: task.kind,
      engagement: "DEMO-LAB-001",
      note: "Authorized engagement telemetry (not covert victim tracking)",
    },
  };
  entries.unshift(entry);
  if (entries.length > MAX) entries.length = MAX;
  return entry;
}

export function addManualTelemetry(input: {
  label: string;
  lat: number;
  lon: number;
  place?: string;
  kind?: TelemetryEntry["kind"];
}) {
  const entry: TelemetryEntry = {
    id: uid("tel"),
    shortId: uid("e").slice(-8),
    ts: new Date().toISOString(),
    label: input.label,
    kind: input.kind || "manual",
    place: input.place,
    lat: input.lat,
    lon: input.lon,
    meta: { engagement: "DEMO-LAB-001" },
  };
  entries.unshift(entry);
  if (entries.length > MAX) entries.length = MAX;
  return entry;
}

export function listTelemetry(limit = 50) {
  seedIfEmpty();
  return entries.slice(0, limit);
}

export function getTelemetrySnapshot() {
  seedIfEmpty();
  return {
    generatedAt: new Date().toISOString(),
    entries: listTelemetry(80),
    policy:
      "Authorized engagement telemetry only. Not a covert device-tracking product. Pins represent ops nodes and ROE-scoped mission results.",
  };
}
