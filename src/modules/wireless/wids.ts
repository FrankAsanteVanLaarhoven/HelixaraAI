/**
 * Wireless Intrusion Detection — deauthentication / disassociation focus.
 * DEFENSIVE ONLY. Does not transmit frames. UK CMA: detecting impairment
 * attempts on authorised networks ≠ performing unauthorised impairment.
 */

import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";
import {
  checkWidsIngestRate,
  getWifiAdminSync,
  recordWidsIngest,
} from "@/modules/wireless/admin";

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

export function getDeviceVisibility(limit = 40) {
  const byDevice = new Map<
    string,
    {
      mac: string;
      role: "client" | "transmitter" | "ap";
      deauthRx: number;
      deauthTx: number;
      disassoc: number;
      lastSeen: string;
      bssids: Set<string>;
    }
  >();

  const bump = (
    mac: string,
    role: "client" | "transmitter" | "ap",
    field: "deauthRx" | "deauthTx" | "disassoc",
    ts: string,
    bssid: string
  ) => {
    const m = mac.toLowerCase();
    if (!byDevice.has(m)) {
      byDevice.set(m, {
        mac: m,
        role,
        deauthRx: 0,
        deauthTx: 0,
        disassoc: 0,
        lastSeen: ts,
        bssids: new Set(),
      });
    }
    const d = byDevice.get(m)!;
    d[field]++;
    d.lastSeen = ts;
    d.bssids.add(bssid);
  };

  for (const f of frameBuffer.slice(0, 2000)) {
    if (f.type === "deauth") {
      bump(f.receiver, "client", "deauthRx", f.ts, f.bssid);
      bump(f.transmitter, "transmitter", "deauthTx", f.ts, f.bssid);
    } else if (f.type === "disassoc") {
      bump(f.receiver, "client", "disassoc", f.ts, f.bssid);
      bump(f.transmitter, "transmitter", "disassoc", f.ts, f.bssid);
    }
    bump(f.bssid, "ap", "deauthRx", f.ts, f.bssid);
  }

  return Array.from(byDevice.values())
    .map((d) => ({
      mac: d.mac,
      role: d.role,
      deauthRx: d.deauthRx,
      deauthTx: d.deauthTx,
      disassoc: d.disassoc,
      lastSeen: d.lastSeen,
      bssids: Array.from(d.bssids),
      risk:
        d.deauthRx >= 6 || d.deauthTx >= 8
          ? "elevated"
          : d.deauthRx > 0
            ? "watch"
            : "normal",
    }))
    .sort(
      (a, b) => b.deauthRx + b.deauthTx + b.disassoc - (a.deauthRx + a.deauthTx + a.disassoc)
    )
    .slice(0, limit);
}

export function getEventTimeline(limit = 80) {
  const items: {
    ts: string;
    kind: "frame" | "alert";
    summary: string;
    severity?: string;
  }[] = [];

  for (const a of alerts.slice(0, 40)) {
    items.push({
      ts: a.ts,
      kind: "alert",
      summary: `${a.ruleId}: ${a.title}`,
      severity: a.severity,
    });
  }
  for (const f of frameBuffer.slice(0, 40)) {
    items.push({
      ts: f.ts,
      kind: "frame",
      summary: `${f.type} ${f.transmitter} → ${f.receiver} @ ${f.bssid}`,
    });
  }
  return items
    .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
    .slice(0, limit);
}

export function widsStatus() {
  const admin = getWifiAdminSync();
  return {
    enabled: admin.moduleEnabled,
    mode: "detection-and-incident-response-only",
    transmitsFrames: false,
    offensive: {
      packetInjection: false,
      deauthTx: false,
      jamming: false,
    },
    rules: getWidsConfig(),
    framesBuffered: frameBuffer.length,
    alertCount: alerts.length,
    rateLimit: {
      ingestPerMinute: admin.widsIngestPerMinute,
    },
    legal:
      "Defensive monitoring of authorised networks only. UK Computer Misuse Act 1990: unauthorised acts impairing systems (including wireless disruption) can be criminal. This module detects and guides response; it does not attack.",
    mitigationPlaybook: [
      "Enable 802.11w / PMF (Protected Management Frames) where clients support it",
      "Page SOC on DEAUTH-FLOOD-* / DISASSOC-FLOOD critical/high",
      "Correlate with rogue AP surveys and physical security",
      "Capture sensor evidence; preserve audit trail",
      "Do NOT counter-deauth or jam — out of product scope and legally hazardous",
      "Segment critical clients; investigate multi-client bursts as area denial",
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

/** Ingest one or more management-frame summary events (detection plane only) */
export function ingestWidsFrames(
  events: WidsFrameEvent[],
  opts?: { requireEngagement?: boolean }
): {
  accepted: number;
  rejected: number;
  rateLimited?: boolean;
  alerts: WidsAlert[];
} {
  const admin = getWifiAdminSync();
  if (!admin.moduleEnabled || process.env.HELIXARA_WIFI_MODULE === "off") {
    return { accepted: 0, rejected: events.length, alerts: [] };
  }

  const rate = checkWidsIngestRate(events.length);
  if (!rate.ok) {
    return {
      accepted: 0,
      rejected: events.length,
      rateLimited: true,
      alerts: [],
    };
  }

  let accepted = 0;
  let rejected = 0;
  const before = alerts.length;
  const cfg = getWidsConfig();
  const bssids = new Set<string>();
  const clientHits = new Map<string, number>();

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
    if (ev.type === "deauth" && ev.receiver !== BROADCAST) {
      clientHits.set(ev.receiver, (clientHits.get(ev.receiver) || 0) + 1);
    }
  }

  recordWidsIngest(accepted);
  if (frameBuffer.length > MAX_FRAMES) frameBuffer.length = MAX_FRAMES;
  for (const b of bssids) evaluate(b, cfg);

  // Repeated client disconnect pattern
  for (const [client, n] of clientHits) {
    if (n >= cfg.unicastDeauthThreshold) {
      const sample = frameBuffer.find(
        (f) => f.type === "deauth" && normMac(f.receiver) === client
      );
      if (sample) {
        pushAlert({
          ruleId: "CLIENT-DISCONNECT-REPEAT",
          severity: "medium",
          title: `Repeated client disconnect pattern · ${client}`,
          detail: `${n} deauth-related hits on client in ingest batch / window`,
          bssid: sample.bssid,
          count: n,
          windowSec: cfg.windowSec,
          sampleReceivers: [client],
          engagementId: sample.engagementId,
          sensorId: sample.sensorId,
          recommendation:
            "IR: verify client impact; check for targeted harassment deauth; enable PMF; do not TX counter-frames.",
        });
      }
    }
  }

  return {
    accepted,
    rejected,
    alerts: alerts.slice(0, Math.max(0, alerts.length - before + 8)),
  };
}

export function clearWidsState(opts?: { frames?: boolean; alerts?: boolean }) {
  if (opts?.frames !== false) frameBuffer.length = 0;
  if (opts?.alerts) alerts.length = 0;
}
