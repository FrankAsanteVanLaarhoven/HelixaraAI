/**
 * Authorised lab simulator for Wi‑Fi disconnect scenarios.
 * Injects SYNTHETIC events into WIDS only (injectMode: bus).
 * RF transmission mode is permanently rejected (no weaponisation path).
 *
 * Legal: UK CMA s.3-style impairment against third-party networks is unlawful.
 * Use only on allowlisted lab BSSIDs with engagement attestation.
 */

import { ingestWidsFrames, type WidsFrameEvent } from "@/modules/wireless/wids";
import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";

export type LabScenarioId =
  | "sim.deauth.broadcast_burst"
  | "sim.deauth.targeted_client"
  | "sim.disassoc.storm"
  | "sim.benign.roam"
  | "sim.mixed.noise";

export interface LabSimRequest {
  scenario: LabScenarioId;
  engagementId: string;
  legalBasis: string;
  jurisdiction?: string;
  /** Must be allowlisted */
  bssid: string;
  clientMac?: string;
  /** bus = WIDS only (default). rf = always rejected */
  injectMode?: "bus" | "rf";
  /** intensity knobs */
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
}

const DEFAULT_ALLOWLIST = [
  "aa:bb:cc:11:22:01",
  "aa:bb:cc:11:22:05",
  "00:11:22:33:44:55",
];

function allowlist(): string[] {
  const env = process.env.HELIXARA_WIFI_LAB_ALLOWLIST;
  if (!env) return DEFAULT_ALLOWLIST;
  return env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function labModeEnabled(): boolean {
  return (
    process.env.HELIXARA_WIFI_LAB_MODE === "1" ||
    process.env.HELIXARA_WIFI_LAB_MODE === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

export function labSimCatalog() {
  return {
    labModeEnabled: labModeEnabled(),
    allowlist: allowlist(),
    injectModes: {
      bus: "Synthetic events → WIDS detector (authorised)",
      rf: "DISABLED — never transmits management frames",
    },
    scenarios: [
      {
        id: "sim.deauth.broadcast_burst",
        name: "Broadcast deauth burst",
        description:
          "Synthetic broadcast deauthentication flood for detector tuning",
      },
      {
        id: "sim.deauth.targeted_client",
        name: "Targeted client deauth",
        description: "Unicast deauth pattern against one lab client MAC",
      },
      {
        id: "sim.disassoc.storm",
        name: "Disassociation storm",
        description: "Synthetic disassoc flood pattern",
      },
      {
        id: "sim.benign.roam",
        name: "Benign roam (control)",
        description: "Low-rate control events to validate false positives",
      },
      {
        id: "sim.mixed.noise",
        name: "Mixed noise + low deauth",
        description: "Mostly benign with sparse deauth for sensitivity checks",
      },
    ],
    policy:
      "Authorised lab evaluation only. Isolated test SSIDs / allowlisted BSSIDs. UK Computer Misuse Act 1990 and local law apply. RF inject is product-disabled.",
  };
}

function genFrames(req: LabSimRequest): WidsFrameEvent[] {
  const now = Date.now();
  const bssid = req.bssid.toLowerCase();
  const sensorId = req.sensorId || "lab-sim";
  const engagementId = req.engagementId;
  const count = Math.min(200, Math.max(1, req.count ?? 20));
  const client = (req.clientMac || "3c:22:fb:10:20:30").toLowerCase();
  const frames: WidsFrameEvent[] = [];

  const push = (partial: Omit<WidsFrameEvent, "engagementId" | "sensorId">) => {
    frames.push({
      ...partial,
      engagementId,
      sensorId,
    });
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
      // sparse management-like noise — below flood thresholds
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

export function runLabSimulation(req: LabSimRequest): LabSimResult {
  const runId = uid("labsim");
  const policy = labSimCatalog().policy;

  if (process.env.HELIXARA_WIFI_MODULE === "off") {
    return {
      runId,
      ok: false,
      error: "Wi‑Fi module disabled (HELIXARA_WIFI_MODULE=off)",
      scenario: req.scenario,
      injectMode: req.injectMode || "bus",
      framesGenerated: 0,
      widsAccepted: 0,
      alertHint: "",
      policy,
    };
  }

  if (!labModeEnabled()) {
    return {
      runId,
      ok: false,
      error:
        "Lab mode disabled. Set HELIXARA_WIFI_LAB_MODE=1 for authorised simulation.",
      scenario: req.scenario,
      injectMode: req.injectMode || "bus",
      framesGenerated: 0,
      widsAccepted: 0,
      alertHint: "",
      policy,
    };
  }

  if (!req.engagementId?.trim() || !req.legalBasis?.trim()) {
    return {
      runId,
      ok: false,
      error: "engagementId and legalBasis are required (ROE / lab booking).",
      scenario: req.scenario,
      injectMode: req.injectMode || "bus",
      framesGenerated: 0,
      widsAccepted: 0,
      alertHint: "",
      policy,
    };
  }

  const injectMode = req.injectMode || "bus";
  if (injectMode === "rf") {
    return {
      runId,
      ok: false,
      error:
        "injectMode 'rf' is permanently disabled. HelixaraAI will not transmit deauth/disassoc frames.",
      scenario: req.scenario,
      injectMode,
      framesGenerated: 0,
      widsAccepted: 0,
      alertHint: "",
      policy,
    };
  }

  const bssid = req.bssid.toLowerCase();
  if (!allowlist().includes(bssid)) {
    return {
      runId,
      ok: false,
      error: `BSSID ${bssid} not in lab allowlist. Configure HELIXARA_WIFI_LAB_ALLOWLIST.`,
      scenario: req.scenario,
      injectMode,
      framesGenerated: 0,
      widsAccepted: 0,
      alertHint: "",
      policy,
    };
  }

  const frames = genFrames({ ...req, bssid });
  const ingest = ingestWidsFrames(frames, { requireEngagement: false });

  emitEvent({
    type: "agent.task",
    source: "lab-wifi.sim",
    severity: "info",
    title: `Lab sim ${req.scenario} · ${frames.length} synthetic frames`,
    payload: {
      runId,
      scenario: req.scenario,
      bssid,
      engagementId: req.engagementId,
      jurisdiction: req.jurisdiction || "UK",
      widsAccepted: ingest.accepted,
    },
  });

  return {
    runId,
    ok: true,
    scenario: req.scenario,
    injectMode,
    framesGenerated: frames.length,
    widsAccepted: ingest.accepted,
    alertHint:
      req.scenario === "sim.benign.roam"
        ? "Control scenario — expect few or no flood alerts"
        : "Check /console/wids for DEAUTH-*/DISASSOC-* alerts",
    policy,
  };
}
