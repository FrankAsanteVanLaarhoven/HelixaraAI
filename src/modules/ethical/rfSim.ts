/**
 * Wireless deauth — SOFTWARE LAB SIMULATION ONLY.
 * Feeds WIDS training events. OTA inject permanently OFF.
 */

import { uid } from "@/lib/utils";
import { HARD_BLOCKS, requireEthicalUsage } from "@/modules/ethical/usage";
import { elevatedOrMessage, requireElevatedCapability } from "@/modules/ethical/gates";
import { ingestWidsFrames } from "@/modules/wireless/wids";

export interface RfSimJob {
  id: string;
  mode: "software_sim";
  otaInject: false;
  bssid: string;
  channel: number;
  framesGenerated: number;
  engagementId: string;
  ts: string;
  note: string;
}

const jobs: RfSimJob[] = [];

export async function listRfSim() {
  const elev = await elevatedOrMessage("rfInject");
  return {
    gate: requireEthicalUsage(),
    jobs: jobs.slice(0, 30),
    policy: {
      otaInject: elev.allowed,
      deauthLive: elev.allowed,
      jamming: false,
      message: elev.message,
      allowed: elev.allowed
        ? "elevated OTA path authorized (dual-control) + software WIDS sim"
        : "software frame events into WIDS for detection training",
      dualControl: true,
      authorizers: ["owner", "superadmin"],
    },
  };
}

export async function runRfSoftwareSim(input: {
  engagementId: string;
  bssid?: string;
  channel?: number;
  count?: number;
  /** Requires elevated dual-control when true */
  otaInject?: boolean;
}) {
  const gate = requireEthicalUsage();
  if (!gate.ok) return gate;

  let otaAuthorized = false;
  if (input.otaInject) {
    const elev = await requireElevatedCapability("rf_ota_inject");
    if (!elev.ok) {
      return { ok: false as const, reason: elev.reason };
    }
    otaAuthorized = true;
  }

  if (!input.engagementId?.trim()) {
    return { ok: false as const, reason: "engagementId required for lab sim" };
  }

  const count = Math.min(Math.max(input.count ?? 12, 1), 40);
  const bssid = (input.bssid || "AA:BB:CC:DD:EE:01").toUpperCase();
  const channel = input.channel ?? 6;
  const now = Date.now();

  const frames = Array.from({ length: count }).map((_, i) => ({
    ts: new Date(now - (count - i) * 400).toISOString(),
    type: (i % 5 === 0 ? "disassoc" : "deauth") as "deauth" | "disassoc",
    transmitter: "DE:AD:BE:EF:00:01",
    receiver: i % 3 === 0 ? "FF:FF:FF:FF:FF:FF" : `11:22:33:44:55:${(10 + i).toString(16)}`,
    bssid,
    reasonCode: 7,
    channel,
    rssi: -55 - (i % 10),
    sensorId: "lab-sim-sensor",
    engagementId: input.engagementId,
  }));

  const result = ingestWidsFrames(frames, { requireEngagement: true });

  const job: RfSimJob = {
    id: uid("rfs"),
    mode: "software_sim",
    otaInject: false,
    bssid,
    channel,
    framesGenerated: frames.length,
    engagementId: input.engagementId,
    ts: new Date().toISOString(),
    note: otaAuthorized
      ? "Elevated dual-control OTA flag set — Helixara still emits software WIDS events only; external authorized RF gear is operator-owned."
      : "Software-only events for WIDS. No RF transmitted.",
  };
  jobs.unshift(job);

  return {
    ok: true as const,
    job,
    wids: result,
    otaAuthorized,
    message: otaAuthorized
      ? "Elevated RF path authorized by owner+superadmin. Product does not TX RF; attach authorized external gear under ROE."
      : HARD_BLOCKS.rfInject,
  };
}
