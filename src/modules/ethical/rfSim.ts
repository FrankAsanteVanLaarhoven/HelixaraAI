/**
 * Wireless deauth — SOFTWARE LAB SIMULATION ONLY.
 * Feeds WIDS training events. OTA inject permanently OFF.
 */

import { uid } from "@/lib/utils";
import { HARD_BLOCKS, requireEthicalUsage } from "@/modules/ethical/usage";
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

export function listRfSim() {
  return {
    gate: requireEthicalUsage(),
    jobs: jobs.slice(0, 30),
    policy: {
      otaInject: false,
      deauthLive: false,
      jamming: false,
      message: HARD_BLOCKS.rfInject,
      allowed: "software frame events into WIDS for detection training",
    },
  };
}

export function runRfSoftwareSim(input: {
  engagementId: string;
  bssid?: string;
  channel?: number;
  count?: number;
  /** Rejected if true */
  otaInject?: boolean;
}) {
  const gate = requireEthicalUsage();
  if (!gate.ok) return gate;

  if (input.otaInject) {
    return { ok: false as const, reason: HARD_BLOCKS.rfInject };
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
    note: "Software-only events for WIDS. No RF transmitted.",
  };
  jobs.unshift(job);

  return {
    ok: true as const,
    job,
    wids: result,
    message: HARD_BLOCKS.rfInject,
  };
}
