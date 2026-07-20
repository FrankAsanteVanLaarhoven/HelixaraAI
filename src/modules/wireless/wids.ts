/**
 * Wireless Intrusion Detection — deauthentication / disassociation focus.
 * DEFENSIVE ONLY. Does not transmit frames. UK CMA: detecting impairment
 * attempts on authorised networks ≠ performing unauthorised impairment.
 */

import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";

export type MgmtFrameType = "deauth" | "disassoc" | "other_mgmt";

export interface WidsFrameEvent {
  id?: string;
  ts: string;
  type: MgmtFrameType;
  transmitter: string;
  receiver: string;
  bssid: string;
  reasonCode?: number;
  channel?: number;
  rssi?: number;
  sensorId?: string;
  /** Must be present for non-sim production sensors */
  engagementId?: string;
}

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface WidsAlert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  ts: string;
  title: string;
  detail: string;
  bssid: string;
  count: number;
  windowSec: number;
  sampleReceivers: string[];
  engagementId?: string;
  sensorId?: string;
  recommendation: string;
}

export interface WidsRuleConfig {
  windowSec: number;
  broadcastDeauthThreshold: number;
  unicastDeauthThreshold: number;
  disassocThreshold: number;
  multiClientThreshold: number;
  multiClientMinClients: number;
}

const DEFAULT_RULES: WidsRuleConfig = {
  windowSec: 10,
  broadcastDeauthThreshold: 8,
  unicastDeauthThreshold: 6,
  disassocThreshold: 8,
  multiClientThreshold: 12,
  multiClientMinClients: 3,
};

const frameBuffer: WidsFrameEvent[] = [];
const alerts: WidsAlert[] = [];
const MAX_FRAMES = 5000;
const MAX_ALERTS = 500;

const BROADCAST = "ff:ff:ff:ff:ff:ff";

function normMac(m: string) {
  return m.trim().toLowerCase();
}

export function getWidsConfig(): WidsRuleConfig {
  return { ...DEFAULT_RULES };
}

export function listWidsAlerts(limit = 50): WidsAlert[] {
  return alerts.slice(0, limit);
}

export function listRecentFrames(limit = 100): WidsFrameEvent[] {
  return frameBuffer.slice(0, limit);
}

export function widsStatus() {
  return {
    enabled: process.env.HELIXARA_WIFI_MODULE !== "off",
    mode: "detection-only",
    transmitsFrames: false,
    rules: getWidsConfig(),
    framesBuffered: frameBuffer.length,
    alertCount: alerts.length,
    legal:
      "Defensive monitoring of authorised networks only. UK Computer Misuse Act 1990: unauthorised acts impairing systems (including wireless disruption) are criminal. This module detects; it does not attack.",
    recommendationsBaseline: [
      "Enable 802.11w / PMF where client ecosystem allows",
      "Alert SOC on DEAUTH-FLOOD-* critical/high",
      "Correlate with rogue AP and physical security",
      "Do not respond with deauth counter-attacks",
    ],
  };
}

function pushAlert(a: Omit<WidsAlert, "id" | "ts"> & { ts?: string }) {
  const alert: WidsAlert = {
    id: uid("wids"),
    ts: a.ts || new Date().toISOString(),
    ...a,
  };
  // de-dupe same rule+bssid within 30s
  const recent = alerts[0];
  if (
    recent &&
    recent.ruleId === alert.ruleId &&
    recent.bssid === alert.bssid &&
    +new Date(alert.ts) - +new Date(recent.ts) < 30_000
  ) {
    recent.count = Math.max(recent.count, alert.count);
    recent.detail = alert.detail;
    return recent;
  }
  alerts.unshift(alert);
  if (alerts.length > MAX_ALERTS) alerts.length = MAX_ALERTS;

  emitEvent({
    type: "alert.raised",
    source: "wids",
    severity:
      alert.severity === "critical"
        ? "critical"
        : alert.severity === "high"
          ? "warn"
          : "info",
    title: alert.title,
    payload: {
      ruleId: alert.ruleId,
      bssid: alert.bssid,
      count: alert.count,
      engagementId: alert.engagementId,
    },
  });

  const hook = process.env.WIDS_WEBHOOK_URL;
  if (hook) {
    void fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined);
  }

  return alert;
}

function evaluate(bssid: string, cfg: WidsRuleConfig) {
  const now = Date.now();
  const windowMs = cfg.windowSec * 1000;
  const frames = frameBuffer.filter(
    (f) =>
      normMac(f.bssid) === normMac(bssid) &&
      now - +new Date(f.ts) <= windowMs &&
      (f.type === "deauth" || f.type === "disassoc")
  );

  const deauth = frames.filter((f) => f.type === "deauth");
  const disassoc = frames.filter((f) => f.type === "disassoc");

  const bcast = deauth.filter((f) => normMac(f.receiver) === BROADCAST);
  if (bcast.length >= cfg.broadcastDeauthThreshold) {
    pushAlert({
      ruleId: "DEAUTH-FLOOD-BCAST",
      severity: "critical",
      title: `Broadcast deauth flood · ${bssid}`,
      detail: `${bcast.length} broadcast deauth frames in ${cfg.windowSec}s`,
      bssid,
      count: bcast.length,
      windowSec: cfg.windowSec,
      sampleReceivers: [BROADCAST],
      engagementId: bcast[0]?.engagementId,
      sensorId: bcast[0]?.sensorId,
      recommendation:
        "Defensive: escalate to SOC; verify PMF/802.11w; locate rogue transmitter; do not counter-deauth.",
    });
  }

  const byClient = new Map<string, number>();
  for (const f of deauth) {
    const r = normMac(f.receiver);
    if (r === BROADCAST) continue;
    byClient.set(r, (byClient.get(r) || 0) + 1);
  }
  for (const [client, count] of byClient) {
    if (count >= cfg.unicastDeauthThreshold) {
      pushAlert({
        ruleId: "DEAUTH-FLOOD-UNICAST",
        severity: "high",
        title: `Targeted deauth · client ${client}`,
        detail: `${count} unicast deauth to ${client} on BSSID ${bssid} in ${cfg.windowSec}s`,
        bssid,
        count,
        windowSec: cfg.windowSec,
        sampleReceivers: [client],
        recommendation:
          "Defensive: check client impact; capture sensor evidence; investigate nearby RF sources.",
      });
    }
  }

  if (disassoc.length >= cfg.disassocThreshold) {
    pushAlert({
      ruleId: "DISASSOC-FLOOD",
      severity: "high",
      title: `Disassoc flood · ${bssid}`,
      detail: `${disassoc.length} disassoc frames in ${cfg.windowSec}s`,
      bssid,
      count: disassoc.length,
      windowSec: cfg.windowSec,
      sampleReceivers: disassoc.slice(0, 5).map((f) => f.receiver),
      recommendation:
        "Defensive: treat similar to deauth DoS; validate AP health and rogue APs.",
    });
  }

  const distinctClients = byClient.size;
  if (
    deauth.length >= cfg.multiClientThreshold &&
    distinctClients >= cfg.multiClientMinClients
  ) {
    pushAlert({
      ruleId: "DEAUTH-BURST-MULTI-CLIENT",
      severity: "high",
      title: `Multi-client deauth burst · ${bssid}`,
      detail: `${deauth.length} deauth across ${distinctClients} clients in ${cfg.windowSec}s`,
      bssid,
      count: deauth.length,
      windowSec: cfg.windowSec,
      sampleReceivers: Array.from(byClient.keys()).slice(0, 8),
      recommendation:
        "Defensive: possible area denial; coordinate physical security + WIDS sensors.",
    });
  }
}

/** Ingest one or more management-frame summary events */
export function ingestWidsFrames(
  events: WidsFrameEvent[],
  opts?: { requireEngagement?: boolean }
): { accepted: number; rejected: number; alerts: WidsAlert[] } {
  if (process.env.HELIXARA_WIFI_MODULE === "off") {
    return { accepted: 0, rejected: events.length, alerts: [] };
  }

  let accepted = 0;
  let rejected = 0;
  const before = alerts.length;
  const cfg = getWidsConfig();
  const bssids = new Set<string>();

  for (const raw of events) {
    if (opts?.requireEngagement && !raw.engagementId) {
      rejected++;
      continue;
    }
    if (!raw.type || !raw.bssid || !raw.transmitter || !raw.receiver) {
      rejected++;
      continue;
    }
    const ev: WidsFrameEvent = {
      ...raw,
      id: raw.id || uid("frm"),
      ts: raw.ts || new Date().toISOString(),
      transmitter: normMac(raw.transmitter),
      receiver: normMac(raw.receiver),
      bssid: normMac(raw.bssid),
    };
    frameBuffer.unshift(ev);
    accepted++;
    bssids.add(ev.bssid);
  }

  if (frameBuffer.length > MAX_FRAMES) frameBuffer.length = MAX_FRAMES;
  for (const b of bssids) evaluate(b, cfg);

  return {
    accepted,
    rejected,
    alerts: alerts.slice(0, Math.max(0, alerts.length - before + 5)),
  };
}

export function clearWidsState(opts?: { frames?: boolean; alerts?: boolean }) {
  if (opts?.frames !== false) frameBuffer.length = 0;
  if (opts?.alerts) alerts.length = 0;
}
