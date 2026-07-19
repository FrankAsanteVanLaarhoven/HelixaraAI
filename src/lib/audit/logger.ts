import { uid } from "@/lib/utils";
import { promises as fs } from "fs";
import path from "path";

export type AuditSeverity = "info" | "warn" | "critical";

export interface AuditEvent {
  id: string;
  ts: string;
  operatorId: string;
  action: string;
  resource?: string;
  risk?: string;
  allowed: boolean;
  details?: Record<string, unknown>;
  severity: AuditSeverity;
  engagementId?: string;
}

const MEM: AuditEvent[] = [];
const MAX_MEM = 2000;

function dataDir() {
  return path.join(process.cwd(), "data");
}

function auditFile() {
  return path.join(dataDir(), "audit.ndjson");
}

export async function appendAudit(
  event: Omit<AuditEvent, "id" | "ts"> & { ts?: string }
): Promise<AuditEvent> {
  const full: AuditEvent = {
    id: uid("aud"),
    ts: event.ts ?? new Date().toISOString(),
    ...event,
  };

  MEM.unshift(full);
  if (MEM.length > MAX_MEM) MEM.pop();

  try {
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.appendFile(auditFile(), JSON.stringify(full) + "\n", "utf8");
  } catch {
    // disk optional — memory still holds events for session
  }

  return full;
}

export function listAudit(limit = 100): AuditEvent[] {
  return MEM.slice(0, limit);
}

export async function loadAuditFromDisk(limit = 200): Promise<AuditEvent[]> {
  try {
    const raw = await fs.readFile(auditFile(), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const events = lines
      .slice(-limit)
      .map((l) => JSON.parse(l) as AuditEvent)
      .reverse();
    // hydrate memory if empty
    if (MEM.length === 0) {
      MEM.push(...events);
    }
    return events;
  } catch {
    return listAudit(limit);
  }
}
