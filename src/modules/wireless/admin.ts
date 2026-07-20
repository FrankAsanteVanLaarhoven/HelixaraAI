/**
 * Admin controls, rate limits, and authorised-use state for Wi‑Fi monitoring.
 * OTA offensive TX locked by default — dual-control owner+superadmin can authorize elevated RF path.
 */

import { promises as fs } from "fs";
import path from "path";
import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";

export interface WifiAdminState {
  moduleEnabled: boolean;
  labModeEnabled: boolean;
  labAllowlist: string[];
  /** Max lab sim runs per rolling hour */
  labSimRateLimitPerHour: number;
  /** Max synthetic frames per sim run */
  maxFramesPerSim: number;
  /** Max WIDS ingest events per minute */
  widsIngestPerMinute: number;
  hashMacsInUi: boolean;
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT: WifiAdminState = {
  moduleEnabled: process.env.HELIXARA_WIFI_MODULE !== "off",
  labModeEnabled:
    process.env.HELIXARA_WIFI_LAB_MODE === "1" ||
    process.env.HELIXARA_WIFI_LAB_MODE === "true" ||
    process.env.NODE_ENV !== "production",
  labAllowlist: (
    process.env.HELIXARA_WIFI_LAB_ALLOWLIST ||
    "aa:bb:cc:11:22:01,aa:bb:cc:11:22:05,00:11:22:33:44:55"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  labSimRateLimitPerHour: Number(process.env.HELIXARA_LAB_SIM_RATE_HOUR || 30),
  maxFramesPerSim: Number(process.env.HELIXARA_LAB_SIM_MAX_FRAMES || 200),
  widsIngestPerMinute: Number(process.env.HELIXARA_WIDS_INGEST_PER_MIN || 2000),
  hashMacsInUi: false,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

let state: WifiAdminState = { ...DEFAULT };
const simRunTimestamps: number[] = [];
const ingestTimestamps: number[] = [];
const adminAudit: {
  id: string;
  ts: string;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
}[] = [];

function stateFile() {
  return path.join(process.cwd(), "data", "wireless", "admin.json");
}

export async function loadWifiAdmin(): Promise<WifiAdminState> {
  try {
    const raw = await fs.readFile(stateFile(), "utf8");
    state = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    state = { ...DEFAULT };
  }
  // env kill switch always wins
  if (process.env.HELIXARA_WIFI_MODULE === "off") {
    state.moduleEnabled = false;
  }
  return { ...state };
}

export async function saveWifiAdmin(
  patch: Partial<WifiAdminState>,
  actor = "admin"
): Promise<WifiAdminState> {
  await loadWifiAdmin();
  // Never allow enabling offensive flags — they don't exist on state
  const next = {
    ...state,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
  if (process.env.HELIXARA_WIFI_MODULE === "off") {
    next.moduleEnabled = false;
  }
  if (patch.labAllowlist) {
    next.labAllowlist = patch.labAllowlist.map((s) => s.toLowerCase());
  }
  state = next;
  await fs.mkdir(path.dirname(stateFile()), { recursive: true });
  await fs.writeFile(stateFile(), JSON.stringify(state, null, 2), "utf8");

  adminAudit.unshift({
    id: uid("wadmin"),
    ts: new Date().toISOString(),
    actor,
    action: "admin.update",
    detail: patch as Record<string, unknown>,
  });
  if (adminAudit.length > 200) adminAudit.length = 200;

  emitEvent({
    type: "agent.task",
    source: "wireless.admin",
    severity: "info",
    title: "Wi‑Fi admin controls updated",
    payload: { actor, keys: Object.keys(patch) },
  });

  return { ...state };
}

export function getWifiAdminSync(): WifiAdminState {
  if (process.env.HELIXARA_WIFI_MODULE === "off") {
    return { ...state, moduleEnabled: false };
  }
  return { ...state };
}

export function listAdminAudit(limit = 50) {
  return adminAudit.slice(0, limit);
}

/** Rate limit: lab simulations per rolling hour */
export function checkLabSimRateLimit(): {
  ok: boolean;
  remaining: number;
  limit: number;
} {
  const limit = state.labSimRateLimitPerHour;
  const hourAgo = Date.now() - 3600_000;
  while (simRunTimestamps.length && simRunTimestamps[0] < hourAgo) {
    simRunTimestamps.shift();
  }
  const used = simRunTimestamps.length;
  return {
    ok: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

export function recordLabSimRun() {
  simRunTimestamps.push(Date.now());
}

/** Rate limit: WIDS ingest events per rolling minute */
export function checkWidsIngestRate(count: number): {
  ok: boolean;
  remaining: number;
  limit: number;
} {
  const limit = state.widsIngestPerMinute;
  const minuteAgo = Date.now() - 60_000;
  while (ingestTimestamps.length && ingestTimestamps[0] < minuteAgo) {
    ingestTimestamps.shift();
  }
  const used = ingestTimestamps.length;
  if (used + count > limit) {
    return { ok: false, remaining: Math.max(0, limit - used), limit };
  }
  return { ok: true, remaining: Math.max(0, limit - used - count), limit };
}

export function recordWidsIngest(count: number) {
  const now = Date.now();
  for (let i = 0; i < count; i++) ingestTimestamps.push(now);
}

export async function offensiveCapabilities() {
  const { isCapabilityAuthorized } = await import("@/modules/auth/elevated");
  const elev = await isCapabilityAuthorized("rf_ota_inject");
  return {
    packetInjectionOta: elev.authorized,
    deauthTransmission: elev.authorized,
    jamming: false,
    evilTwin: false,
    elevated: elev.authorized,
    dualControl: true,
    authorizers: ["owner", "superadmin"],
    note: elev.authorized
      ? `Elevated RF path authorized by owner+superadmin until ${elev.grant?.expiresAt || "n/a"}. Helixara still does not TX RF natively — external authorized gear under ROE.`
      : "OTA inject/deauth locked. Software WIDS sim available. Unlock only via dual-control at /console/admin/elevated.",
  };
}

export function authorisedUseBanner() {
  return {
    a: "Controlled lab or defensive monitoring of authorised networks only.",
    b: "Safeguards: OTA deauth/inject locked unless owner+superadmin dual-control; audit logs; rate limits; admin kill switch; lab allowlists; ROE attestation.",
    c: "UK Computer Misuse Act 1990 and local law apply. Unauthorised impairment of systems/networks can be criminal. Ethical hacking only under ROE.",
  };
}
