/**
 * HelixaraAI real-time event bus (in-process + SSE-ready).
 * Production path: swap for Redis Streams / NATS / Kafka.
 */

import { uid } from "@/lib/utils";

export type HelixEventType =
  | "system.boot"
  | "scrape.started"
  | "scrape.completed"
  | "scrape.blocked"
  | "osint.completed"
  | "mission.started"
  | "mission.completed"
  | "agent.task"
  | "satellite.updated"
  | "flight.updated"
  | "weather.updated"
  | "alert.raised"
  | "news.ingested"
  | "twin.synced"
  | "quantum.job"
  | "llm.completion"
  | "crawl.stealth"
  | "fx.updated";

export interface HelixEvent {
  id: string;
  type: HelixEventType;
  ts: string;
  source: string;
  severity: "debug" | "info" | "warn" | "critical";
  title: string;
  payload?: Record<string, unknown>;
  region?: string;
  locale?: string;
}

type Listener = (event: HelixEvent) => void;

const MAX = 5000;
const buffer: HelixEvent[] = [];
const listeners = new Set<Listener>();

export function emitEvent(
  partial: Omit<HelixEvent, "id" | "ts"> & { ts?: string }
): HelixEvent {
  const event: HelixEvent = {
    id: uid("evt"),
    ts: partial.ts ?? new Date().toISOString(),
    ...partial,
  };
  buffer.unshift(event);
  if (buffer.length > MAX) buffer.length = MAX;
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      /* isolate listener failures */
    }
  }
  return event;
}

export function listEvents(opts?: {
  limit?: number;
  type?: HelixEventType;
  since?: string;
}): HelixEvent[] {
  let out = buffer;
  if (opts?.type) out = out.filter((e) => e.type === opts.type);
  if (opts?.since) {
    const t = +new Date(opts.since);
    out = out.filter((e) => +new Date(e.ts) >= t);
  }
  return out.slice(0, opts?.limit ?? 100);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function eventStats() {
  const byType: Record<string, number> = {};
  for (const e of buffer) byType[e.type] = (byType[e.type] || 0) + 1;
  return {
    total: buffer.length,
    listeners: listeners.size,
    byType,
    latest: buffer[0]?.ts ?? null,
  };
}

// seed boot event
emitEvent({
  type: "system.boot",
  source: "helixaraai.events",
  severity: "info",
  title: "HelixaraAI event bus online",
  payload: { modular: true },
});
