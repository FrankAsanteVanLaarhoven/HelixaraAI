import { uid } from "@/lib/utils";
import {
  ALL_CHECKS,
  type BountyFinding,
  type BountyProgram,
  type RestoreJob,
} from "@/modules/bounty/types";

const programs = new Map<string, BountyProgram>();
const findings = new Map<string, BountyFinding>();
const restores = new Map<string, RestoreJob>();

function seed() {
  if (programs.size) return;
  const now = new Date().toISOString();
  const id = uid("bprog");
  programs.set(id, {
    id,
    shortId: id.slice(-8),
    name: "Helixara demo bounty program",
    owner: "Helixara Lab",
    engagementId: "BOUNTY-DEMO-001",
    legalBasis: "Owned lab assets / authorized demo scope",
    inScope: ["example.com", "www.example.com", "httpbin.org"],
    outOfScope: ["*.third-party.example", "production-payments"],
    allowedChecks: [...ALL_CHECKS],
    maxSeverityAutoAccept: "medium",
    active: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    createdAt: now,
    updatedAt: now,
    notes: "Demo program — replace with real ROE scope before production use.",
  });
}

seed();

export function listPrograms(): BountyProgram[] {
  seed();
  return [...programs.values()].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function getProgram(id: string): BountyProgram | undefined {
  return programs.get(id);
}

export function createProgram(input: {
  name: string;
  owner: string;
  engagementId: string;
  legalBasis: string;
  inScope: string[];
  outOfScope?: string[];
  allowedChecks?: BountyProgram["allowedChecks"];
  expiresAt?: string;
  notes?: string;
}): BountyProgram {
  seed();
  const now = new Date().toISOString();
  const id = uid("bprog");
  const p: BountyProgram = {
    id,
    shortId: id.slice(-8),
    name: input.name.trim(),
    owner: input.owner.trim(),
    engagementId: input.engagementId.trim(),
    legalBasis: input.legalBasis.trim(),
    inScope: input.inScope.map((s) => s.trim().toLowerCase()).filter(Boolean),
    outOfScope: (input.outOfScope || []).map((s) => s.trim().toLowerCase()),
    allowedChecks: input.allowedChecks?.length
      ? input.allowedChecks
      : [...ALL_CHECKS],
    maxSeverityAutoAccept: "medium",
    active: true,
    expiresAt:
      input.expiresAt ||
      new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    createdAt: now,
    updatedAt: now,
    notes: input.notes,
  };
  programs.set(id, p);
  return p;
}

export function touchProgram(p: BountyProgram) {
  p.updatedAt = new Date().toISOString();
  programs.set(p.id, p);
  return p;
}

export function listFindings(programId?: string, limit = 100): BountyFinding[] {
  let rows = [...findings.values()];
  if (programId) rows = rows.filter((f) => f.programId === programId);
  return rows
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, limit);
}

export function getFinding(id: string): BountyFinding | undefined {
  return findings.get(id);
}

export function saveFinding(f: BountyFinding) {
  f.updatedAt = new Date().toISOString();
  findings.set(f.id, f);
  return f;
}

export function listRestores(limit = 50): RestoreJob[] {
  return [...restores.values()]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, limit);
}

export function getRestore(id: string): RestoreJob | undefined {
  return restores.get(id);
}

export function saveRestore(r: RestoreJob) {
  r.updatedAt = new Date().toISOString();
  restores.set(r.id, r);
  return r;
}

export function snapshot() {
  seed();
  return {
    policy: {
      scope:
        "Bug bounty search/find/restore only on program in-scope assets under attested ROE. Not unauthorized scanning of arbitrary systems.",
      dualControlElevated: "Destructive restore automation stays manual steps + verify probes.",
    },
    programs: listPrograms(),
    findings: listFindings(undefined, 80),
    restores: listRestores(40),
  };
}
