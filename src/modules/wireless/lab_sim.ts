/**
 * Lab-only test harness: software simulation of attack-like events.
 * NEVER transmits deauth/disassoc/jam frames over the air.
 *
 * PRD: docs/PRD_WIFI_SECURITY_MONITORING.md — offensive TX permanently excluded.
 */

import { ingestWidsFrames, type WidsFrameEvent } from "@/modules/wireless/wids";
import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";
import {
  checkLabSimRateLimit,
  getWifiAdminSync,
  loadWifiAdmin,
  recordLabSimRun,
} from "@/modules/wireless/admin";

export type LabScenarioId =
  | "sim.deauth.broadcast_burst"
  | "sim.deauth.targeted_client"
  | "sim.disassoc.storm"
  | "sim.benign.roam"
  | "sim.mixed.noise"
  | "sim.disconnect.repeated_client";

export interface LabSimRequest {
  scenario: LabScenarioId;
  engagementId: string;
  legalBasis: string;
  jurisdiction?: string;
  bssid: string;
  clientMac?: string;
  /** bus only. rf always rejected */
  injectMode?: "bus" | "rf";
  count?: number;
  sensorId?: string;
}

export interface LabSimResult {
  runId: string;
  ok: boolean;
  error?: string;
  scenario: LabScenarioId;
  injectMode: string;
  framesGenerated: number;
  widsAccepted: number;
  alertHint: string;
  policy: string;
  rateLimit?: { remaining: number; limit: number };
}

export async function labSimCatalog() {
  const admin = await loadWifiAdmin();
  return {
    labModeEnabled: admin.labModeEnabled && admin.moduleEnabled,
    moduleEnabled: admin.moduleEnabled,
    allowlist: admin.labAllowlist,
    rateLimitPerHour: admin.labSimRateLimitPerHour,
    maxFramesPerSim: admin.maxFramesPerSim,
    injectModes: {
      bus: "Synthetic events → WIDS detector only (authorised lab)",
      rf: "PERMANENTLY DISABLED — no OTA deauth / injection / jam",
    },
    excludedOffensive: {
      packetInjectionOta: false,
      deauthTransmission: false,
      jamming: false,
    },
    scenarios: [
      {
        id: "sim.deauth.broadcast_burst",
        name: "Broadcast deauth burst (sim)",
        description: "Software-only flood pattern for detector tuning",
      },
      {
        id: "sim.deauth.targeted_client",
        name: "Targeted client deauth (sim)",
        description: "Unicast deauth pattern against one lab client MAC",
      },
      {
        id: "sim.disassoc.storm",
        name: "Disassociation storm (sim)",
        description: "Synthetic disassoc flood pattern",
      },
      {
        id: "sim.disconnect.repeated_client",
        name: "Repeated client disconnects (sim)",
        description: "Multiple deauth hits on one client over a short timeline",
      },
      {
        id: "sim.benign.roam",
        name: "Benign roam (control)",
        description: "Control traffic for false-positive checks",
      },
      {
        id: "sim.mixed.noise",
        name: "Mixed noise + low deauth (sim)",
        description: "Sparse attack signal in noise",
      },
    ],
    policy:
      "Lab-only software harness. Simulates attack events without transmitting disruptive frames. UK CMA & local law: do not disrupt third-party networks. Defensive detection evaluation only.",
  };
}

function genFrames(req: LabSimRequest, maxFrames: number): WidsFrameEvent[] {
  const now = Date.now();
  const bssid = req.bssid.toLowerCase();
  const sensorId = req.sensorId || "lab-sim";
  const engagementId = req.engagementId;
  const count = Math.min(maxFrames, Math.max(1, req.count ?? 20));
  const client = (req.clientMac || "3c:22:fb:10:20:30").toLowerCase();
  const frames: WidsFrameEvent[] = [];

  const push = (partial: Omit<WidsFrameEvent, "engagementId" | "sensorId">) => {
    frames.push({ ...partial, engagementId, sensorId });
  };

  switch (req.scenario) {
    case "sim.deauth.broadcast_burst":
      for (let i = 0; i < count; i++) {
        push({
          ts: new Date(now - (count - i) * 50).toISOString(),
          type: "deauth",
          transmitter: "de:ad:be:ef:00:01",
          receiver: "ff:ff:ff:ff:ff:ff",
          bssid,
          reasonCode: 7,
          channel: 6,
          rssi: -50 - (i % 5),
        });
      }
      break;
    case "sim.deauth.targeted_client":
    case "sim.disconnect.repeated_client":
      for (let i = 0; i < count; i++) {
        push({
          ts: new Date(now - (count - i) * 40).toISOString(),
          type: "deauth",
          transmitter: "de:ad:be:ef:00:02",
          receiver: client,
          bssid,
          reasonCode: 6,
          channel: 6,
          rssi: -55,
        });
      }
      break;
    case "sim.disassoc.storm":
      for (let i = 0; i < count; i++) {
        push({
          ts: new Date(now - (count - i) * 45).toISOString(),
          type: "disassoc",
          transmitter: "de:ad:be:ef:00:03",
          receiver: i % 2 === 0 ? "ff:ff:ff:ff:ff:ff" : client,
          bssid,
          reasonCode: 8,
          channel: 36,
          rssi: -58,
        });
      }
      break;
    case "sim.benign.roam":
      for (let i = 0; i < 3; i++) {
        push({
          ts: new Date(now - i * 2000).toISOString(),
          type: "other_mgmt",
          transmitter: bssid,
          receiver: client,
          bssid,
          reasonCode: 0,
          channel: 36,
          rssi: -45,
        });
      }
      break;
    case "sim.mixed.noise":
      for (let i = 0; i < count; i++) {
        const isAttack = i % 7 === 0;
        push({
          ts: new Date(now - (count - i) * 30).toISOString(),
          type: isAttack ? "deauth" : "other_mgmt",
          transmitter: isAttack ? "de:ad:be:ef:00:04" : bssid,
          receiver: isAttack ? "ff:ff:ff:ff:ff:ff" : client,
          bssid,
          reasonCode: isAttack ? 7 : 0,
          channel: 11,
          rssi: -60,
        });
      }
      break;
  }

  return frames;
}

export async function runLabSimulation(
  req: LabSimRequest
): Promise<LabSimResult> {
  await loadWifiAdmin();
  const admin = getWifiAdminSync();
  const runId = uid("labsim");
  const catalog = await labSimCatalog();
  const policy = catalog.policy;
  const rate = checkLabSimRateLimit();

  if (!admin.moduleEnabled) {
    return fail(runId, req, "Wi‑Fi module disabled by admin / HELIXARA_WIFI_MODULE=off", policy, rate);
  }
  if (!admin.labModeEnabled) {
    return fail(
      runId,
      req,
      "Lab mode disabled by admin. Enable lab mode for software-only simulation.",
      policy,
      rate
    );
  }
  if (!req.engagementId?.trim() || !req.legalBasis?.trim()) {
    return fail(
      runId,
      req,
      "engagementId and legalBasis required (authorised-use boundary).",
      policy,
      rate
    );
  }

  const injectMode = req.injectMode || "bus";
  if (injectMode === "rf") {
    return fail(
      runId,
      req,
      "injectMode 'rf' permanently disabled. No packet injection, deauth TX, or jamming.",
      policy,
      rate
    );
  }
  if (!rate.ok) {
    return fail(
      runId,
      req,
      `Lab sim rate limit exceeded (${rate.limit}/hour). Try later or raise admin limit.`,
      policy,
      rate
    );
  }

  const bssid = req.bssid.toLowerCase();
  if (!admin.labAllowlist.includes(bssid)) {
    return fail(
      runId,
      req,
      `BSSID ${bssid} not in lab allowlist (admin control).`,
      policy,
      rate
    );
  }

  const frames = genFrames(req, admin.maxFramesPerSim);
  const ingest = ingestWidsFrames(frames, { requireEngagement: false });
  recordLabSimRun();

  emitEvent({
    type: "agent.task",
    source: "lab-wifi.sim",
    severity: "info",
    title: `Lab sim ${req.scenario} · ${frames.length} synthetic frames (no OTA)`,
    payload: {
      runId,
      scenario: req.scenario,
      bssid,
      engagementId: req.engagementId,
      jurisdiction: req.jurisdiction || "UK",
      widsAccepted: ingest.accepted,
      ota: false,
    },
  });

  return {
    runId,
    ok: true,
    scenario: req.scenario,
    injectMode: "bus",
    framesGenerated: frames.length,
    widsAccepted: ingest.accepted,
    alertHint:
      req.scenario === "sim.benign.roam"
        ? "Control scenario — expect few or no flood alerts"
        : "Open /console/wids for alerts, devices, and timeline",
    policy,
    rateLimit: checkLabSimRateLimit(),
  };
}

function fail(
  runId: string,
  req: LabSimRequest,
  error: string,
  policy: string,
  rate: { remaining: number; limit: number }
): LabSimResult {
  return {
    runId,
    ok: false,
    error,
    scenario: req.scenario,
    injectMode: req.injectMode || "bus",
    framesGenerated: 0,
    widsAccepted: 0,
    alertHint: "",
    policy,
    rateLimit: rate,
  };
}
