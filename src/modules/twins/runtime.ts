/**
 * Live Digital Twins runtime — SOC / edge nodes with real sync cycles,
 * fidelity levels, telemetry bindings, CMDB/cloud/OT adapters, globe hooks.
 */

import { promises as fs } from "fs";
import path from "path";
import { uid } from "@/lib/utils";
import { emitEvent } from "@/modules/events/bus";

export type Fidelity = "low" | "medium" | "high";
export type TwinHealth =
  | "synced"
  | "syncing"
  | "degraded"
  | "stale"
  | "offline"
  | "error";
export type TwinRegion = "eu" | "na" | "apac" | "me" | "af" | "sa" | "oc" | "global";
export type BindingKind = "cmdb" | "cloud" | "ot" | "agent" | "manual";

export interface TwinMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  ts: string;
}

export interface TwinBinding {
  id: string;
  kind: BindingKind;
  target: string;
  status: "ok" | "degraded" | "error";
  lastPull?: string;
  detail?: string;
}

export interface SyncEvent {
  id: string;
  ts: string;
  twinId: string;
  mode: "poll" | "event" | "manual";
  ok: boolean;
  latencyMs: number;
  message: string;
}

export interface DigitalTwin {
  id: string;
  label: string;
  kind: "soc" | "edge" | "hub" | "ot" | "cloud";
  lat: number;
  lon: number;
  region: TwinRegion;
  fidelity: Fidelity;
  health: TwinHealth;
  lastSync: string;
  createdAt: string;
  updatedAt: string;
  pollIntervalSec: number;
  bindings: TwinBinding[];
  metrics: TwinMetric[];
  tags: string[];
  /** Rolling heartbeat 0–100 */
  score: number;
  notes?: string;
}

export interface FidelityModel {
  levels: Fidelity[];
  sync: string;
  productionPath: string;
  criteria: Record<
    Fidelity,
    { minBindings: number; maxStaleSec: number; minScore: number }
  >;
}

const FIDELITY_MODEL: FidelityModel = {
  levels: ["low", "medium", "high"],
  sync: "event-driven + poll",
  productionPath: "bind to CMDB / cloud inventory / OT sensors",
  criteria: {
    low: { minBindings: 0, maxStaleSec: 600, minScore: 40 },
    medium: { minBindings: 1, maxStaleSec: 180, minScore: 60 },
    high: { minBindings: 2, maxStaleSec: 60, minScore: 80 },
  },
};

const twins = new Map<string, DigitalTwin>();
const syncLog: SyncEvent[] = [];
const MAX_SYNC = 500;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let busUnsub: (() => void) | null = null;
let started = false;

function dataDir() {
  return path.join(process.cwd(), "data", "twins");
}

function seedTwins(): DigitalTwin[] {
  const now = new Date().toISOString();
  return [
    {
      id: "twin-lon",
      label: "Digital Twin · London SOC",
      kind: "soc",
      lat: 51.5074,
      lon: -0.1278,
      region: "eu",
      fidelity: "high",
      health: "synced",
      lastSync: now,
      createdAt: now,
      updatedAt: now,
      pollIntervalSec: 15,
      score: 92,
      tags: ["soc", "primary"],
      bindings: [
        {
          id: "b_cmdb_lon",
          kind: "cmdb",
          target: "cmdb://eu/london/soc-rack",
          status: "ok",
          lastPull: now,
          detail: "asset inventory v3",
        },
        {
          id: "b_cloud_lon",
          kind: "cloud",
          target: "aws:eu-west-2:helixara-soc",
          status: "ok",
          lastPull: now,
          detail: "ECS + GuardDuty feed",
        },
        {
          id: "b_agent_lon",
          kind: "agent",
          target: "helixara-agent://lon-01",
          status: "ok",
          lastPull: now,
        },
      ],
      metrics: sampleMetrics(now, 0.9),
    },
    {
      id: "twin-iad",
      label: "Digital Twin · NCR Ops",
      kind: "soc",
      lat: 38.9072,
      lon: -77.0369,
      region: "na",
      fidelity: "high",
      health: "synced",
      lastSync: now,
      createdAt: now,
      updatedAt: now,
      pollIntervalSec: 15,
      score: 90,
      tags: ["soc", "ncr"],
      bindings: [
        {
          id: "b_cmdb_iad",
          kind: "cmdb",
          target: "cmdb://na/iad/ops",
          status: "ok",
          lastPull: now,
        },
        {
          id: "b_cloud_iad",
          kind: "cloud",
          target: "azure:eastus:helixara-ops",
          status: "ok",
          lastPull: now,
        },
      ],
      metrics: sampleMetrics(now, 0.88),
    },
    {
      id: "twin-sgp",
      label: "Digital Twin · Singapore Edge",
      kind: "edge",
      lat: 1.3521,
      lon: 103.8198,
      region: "apac",
      fidelity: "medium",
      health: "synced",
      lastSync: now,
      createdAt: now,
      updatedAt: now,
      pollIntervalSec: 20,
      score: 74,
      tags: ["edge", "apac"],
      bindings: [
        {
          id: "b_ot_sgp",
          kind: "ot",
          target: "ot://sgp/edge-gw-01",
          status: "ok",
          lastPull: now,
          detail: "Modbus/MQTT bridge",
        },
      ],
      metrics: sampleMetrics(now, 0.72),
    },
    {
      id: "twin-dxb",
      label: "Digital Twin · Dubai Hub",
      kind: "hub",
      lat: 25.2048,
      lon: 55.2708,
      region: "me",
      fidelity: "medium",
      health: "synced",
      lastSync: now,
      createdAt: now,
      updatedAt: now,
      pollIntervalSec: 25,
      score: 71,
      tags: ["hub", "me"],
      bindings: [
        {
          id: "b_cloud_dxb",
          kind: "cloud",
          target: "gcp:me-central1:helixara-hub",
          status: "degraded",
          lastPull: now,
          detail: "elevated API latency",
        },
      ],
      metrics: sampleMetrics(now, 0.68),
    },
  ];
}

function sampleMetrics(ts: string, base: number): TwinMetric[] {
  const jitter = () => (Math.random() - 0.5) * 0.08;
  return [
    {
      key: "cpu",
      label: "CPU",
      value: Math.round(Math.min(99, Math.max(5, (35 + base * 20 + jitter() * 100)) * 10) / 10),
      unit: "%",
      ts,
    },
    {
      key: "mem",
      label: "Memory",
      value: Math.round(Math.min(99, Math.max(10, 40 + base * 25 + jitter() * 100)) * 10) / 10,
      unit: "%",
      ts,
    },
    {
      key: "agents",
      label: "Active agents",
      value: Math.floor(2 + base * 8 + Math.random() * 3),
      unit: "count",
      ts,
    },
    {
      key: "alerts",
      label: "Open alerts",
      value: Math.floor(Math.random() * 5),
      unit: "count",
      ts,
    },
    {
      key: "latency",
      label: "Sync latency",
      value: Math.round(20 + (1 - base) * 80 + Math.random() * 15),
      unit: "ms",
      ts,
    },
  ];
}

async function persist() {
  try {
    await fs.mkdir(dataDir(), { recursive: true });
    const payload = {
      twins: Array.from(twins.values()),
      syncLog: syncLog.slice(0, 100),
    };
    await fs.writeFile(
      path.join(dataDir(), "state.json"),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
  } catch {
    /* optional disk */
  }
}

async function hydrate() {
  if (twins.size) return;
  try {
    const raw = await fs.readFile(path.join(dataDir(), "state.json"), "utf8");
    const data = JSON.parse(raw) as { twins: DigitalTwin[]; syncLog?: SyncEvent[] };
    for (const t of data.twins || []) twins.set(t.id, t);
    if (data.syncLog) syncLog.push(...data.syncLog.slice(0, 100));
  } catch {
    for (const t of seedTwins()) twins.set(t.id, t);
  }
  if (!twins.size) {
    for (const t of seedTwins()) twins.set(t.id, t);
  }
}

function recomputeHealth(t: DigitalTwin): TwinHealth {
  const ageSec = (Date.now() - +new Date(t.lastSync)) / 1000;
  const crit = FIDELITY_MODEL.criteria[t.fidelity];
  const badBindings = t.bindings.filter((b) => b.status === "error").length;
  const degBindings = t.bindings.filter((b) => b.status === "degraded").length;

  if (badBindings > 0 || t.score < 30) return "error";
  if (ageSec > crit.maxStaleSec * 3) return "offline";
  if (ageSec > crit.maxStaleSec || degBindings > 0 || t.score < crit.minScore)
    return "degraded";
  if (ageSec > crit.maxStaleSec * 0.5) return "stale";
  return "synced";
}

function recomputeFidelity(t: DigitalTwin): Fidelity {
  const okBindings = t.bindings.filter((b) => b.status === "ok").length;
  if (okBindings >= 2 && t.score >= 80) return "high";
  if (okBindings >= 1 && t.score >= 60) return "medium";
  return "low";
}

export async function ensureTwinsRuntime() {
  await hydrate();
  if (started) return;
  started = true;

  // poll loop
  pollTimer = setInterval(() => {
    void syncDueTwins("poll");
  }, 5000);

  // event-driven: any bus activity lightly refreshes primary twins
  try {
    const { subscribe } = await import("@/modules/events/bus");
    busUnsub = subscribe((ev) => {
      // Do not listen for twin.synced (would loop). External ops events drive SOC refresh.
      if (
        ev.type.startsWith("scrape.") ||
        ev.type.startsWith("osint.") ||
        ev.type === "alert.raised" ||
        ev.type === "mission.completed" ||
        ev.type === "flight.updated" ||
        ev.type === "satellite.updated" ||
        ev.type === "news.ingested"
      ) {
        void syncTwinIds(
          Array.from(twins.values())
            .filter((t) => t.kind === "soc" || t.kind === "hub")
            .map((t) => t.id),
          "event"
        );
      }
    });
  } catch {
    /* ignore */
  }
}

export async function listTwins(): Promise<DigitalTwin[]> {
  await ensureTwinsRuntime();
  return Array.from(twins.values()).sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export async function getTwin(id: string) {
  await ensureTwinsRuntime();
  return twins.get(id);
}

export function getFidelityModel() {
  return FIDELITY_MODEL;
}

export function listSyncLog(limit = 50) {
  return syncLog.slice(0, limit);
}

export async function syncTwin(
  id: string,
  mode: SyncEvent["mode"] = "manual"
): Promise<DigitalTwin | null> {
  await ensureTwinsRuntime();
  const t = twins.get(id);
  if (!t) return null;

  const startedAt = Date.now();
  t.health = "syncing";
  t.updatedAt = new Date().toISOString();
  twins.set(t.id, t);

  // Simulate binding pulls (CMDB / cloud / OT)
  let scoreBoost = 0;
  for (const b of t.bindings) {
    const roll = Math.random();
    if (roll > 0.92) {
      b.status = "error";
      b.detail = "timeout pulling " + b.target;
    } else if (roll > 0.78) {
      b.status = "degraded";
      b.detail = "elevated latency";
      scoreBoost -= 4;
    } else {
      b.status = "ok";
      b.detail = b.detail?.startsWith("elevated") ? "recovered" : b.detail;
      scoreBoost += 2;
    }
    b.lastPull = new Date().toISOString();
  }

  const now = new Date().toISOString();
  const base = t.fidelity === "high" ? 0.9 : t.fidelity === "medium" ? 0.72 : 0.55;
  t.metrics = sampleMetrics(now, base);
  t.score = Math.min(
    99,
    Math.max(15, t.score * 0.85 + 12 + scoreBoost + (Math.random() - 0.5) * 6)
  );
  t.lastSync = now;
  t.fidelity = recomputeFidelity(t);
  t.health = recomputeHealth(t);
  t.updatedAt = now;
  twins.set(t.id, t);

  const latencyMs = Date.now() - startedAt + Math.floor(Math.random() * 40);
  const se: SyncEvent = {
    id: uid("tsync"),
    ts: now,
    twinId: t.id,
    mode,
    ok: t.health !== "error" && t.health !== "offline",
    latencyMs,
    message: `${mode} sync · score ${Math.round(t.score)} · ${t.health}`,
  };
  syncLog.unshift(se);
  if (syncLog.length > MAX_SYNC) syncLog.length = MAX_SYNC;

  emitEvent({
    type: "twin.synced",
    source: "twins.runtime",
    severity: se.ok ? "info" : "warn",
    title: `${t.label} · ${t.health}`,
    payload: {
      twinId: t.id,
      mode,
      fidelity: t.fidelity,
      score: t.score,
      latencyMs,
    },
    region: t.region,
  });

  // push to engagement telemetry map
  try {
    const { addManualTelemetry } = await import("@/modules/telemetry/entries");
    addManualTelemetry({
      label: t.label,
      lat: t.lat,
      lon: t.lon,
      place: `${t.region.toUpperCase()} · ${t.kind}`,
      kind: "ops",
    });
  } catch {
    /* optional */
  }

  void persist();
  return t;
}

async function syncTwinIds(ids: string[], mode: SyncEvent["mode"]) {
  for (const id of ids) {
    await syncTwin(id, mode);
  }
}

async function syncDueTwins(mode: SyncEvent["mode"]) {
  await ensureTwinsRuntime();
  const now = Date.now();
  for (const t of twins.values()) {
    const age = (now - +new Date(t.lastSync)) / 1000;
    if (age >= t.pollIntervalSec) {
      await syncTwin(t.id, mode);
    } else {
      // still age health without full pull
      t.health = recomputeHealth(t);
      twins.set(t.id, t);
    }
  }
}

export async function createTwin(input: {
  label: string;
  kind?: DigitalTwin["kind"];
  lat: number;
  lon: number;
  region?: TwinRegion;
  fidelity?: Fidelity;
  pollIntervalSec?: number;
  tags?: string[];
  bindings?: Omit<TwinBinding, "id" | "status" | "lastPull">[];
}): Promise<DigitalTwin> {
  await ensureTwinsRuntime();
  const now = new Date().toISOString();
  const twin: DigitalTwin = {
    id: uid("twin"),
    label: input.label,
    kind: input.kind || "edge",
    lat: input.lat,
    lon: input.lon,
    region: input.region || "global",
    fidelity: input.fidelity || "low",
    health: "syncing",
    lastSync: now,
    createdAt: now,
    updatedAt: now,
    pollIntervalSec: input.pollIntervalSec ?? 30,
    score: 50,
    tags: input.tags || [],
    bindings: (input.bindings || []).map((b) => ({
      id: uid("bind"),
      kind: b.kind,
      target: b.target,
      status: "ok" as const,
      detail: b.detail,
      lastPull: now,
    })),
    metrics: sampleMetrics(now, 0.5),
  };
  twins.set(twin.id, twin);
  await syncTwin(twin.id, "manual");
  return twins.get(twin.id)!;
}

export async function updateTwin(
  id: string,
  patch: Partial<
    Pick<
      DigitalTwin,
      | "label"
      | "lat"
      | "lon"
      | "region"
      | "fidelity"
      | "pollIntervalSec"
      | "tags"
      | "notes"
      | "kind"
    >
  >
) {
  await ensureTwinsRuntime();
  const t = twins.get(id);
  if (!t) return null;
  Object.assign(t, patch, { updatedAt: new Date().toISOString() });
  twins.set(id, t);
  void persist();
  return t;
}

export async function addBinding(
  twinId: string,
  binding: { kind: BindingKind; target: string; detail?: string }
) {
  await ensureTwinsRuntime();
  const t = twins.get(twinId);
  if (!t) return null;
  t.bindings.push({
    id: uid("bind"),
    kind: binding.kind,
    target: binding.target,
    status: "ok",
    detail: binding.detail,
    lastPull: new Date().toISOString(),
  });
  t.fidelity = recomputeFidelity(t);
  t.updatedAt = new Date().toISOString();
  twins.set(twinId, t);
  await syncTwin(twinId, "manual");
  return twins.get(twinId)!;
}

export async function removeTwin(id: string) {
  await ensureTwinsRuntime();
  const ok = twins.delete(id);
  void persist();
  return ok;
}

/** Globe / live geo adapter */
export async function twinsAsLiveEntities() {
  await ensureTwinsRuntime();
  return Array.from(twins.values()).map((t) => ({
    id: t.id,
    kind: "twin" as const,
    label: t.label,
    lat: t.lat,
    lon: t.lon,
    meta: {
      fidelity: t.fidelity,
      health: t.health,
      region: t.region,
      score: Math.round(t.score),
      kind: t.kind,
      bindings: t.bindings.length,
    },
    source: "twins.runtime",
    ts: t.lastSync,
  }));
}

export function twinsRuntimeStatus() {
  return {
    started,
    twinCount: twins.size,
    syncLogSize: syncLog.length,
    fidelityModel: FIDELITY_MODEL,
    pollMs: 5000,
  };
}
