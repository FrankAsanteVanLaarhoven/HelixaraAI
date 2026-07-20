import { uid } from "@/lib/utils";
import {
  ALL_CHECKS,
  type BountyFinding,
  type BountyProgram,
  type DynamicAsset,
  type RestoreJob,
} from "@/modules/bounty/types";

const programs = new Map<string, BountyProgram>();
const findings = new Map<string, BountyFinding>();
const restores = new Map<string, RestoreJob>();
/** programId → dynamic site inventory */
const assetsByProgram = new Map<string, DynamicAsset[]>();

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
    inScope: ["*.example.com", "example.com", "httpbin.org"],
    outOfScope: ["*.third-party.example", "production-payments"],
    allowedChecks: [...ALL_CHECKS],
    maxSeverityAutoAccept: "medium",
    dynamicDiscovery: true,
    active: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    createdAt: now,
    updatedAt: now,
    notes:
      "Demo program — use *.domain wildcards + dynamic discovery for all sites under authorized roots.",
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
    dynamicDiscovery: true,
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

export function listProgramAssets(programId: string): DynamicAsset[] {
  return [...(assetsByProgram.get(programId) || [])].sort((a, b) =>
    a.host.localeCompare(b.host)
  );
}

export function setProgramAssets(programId: string, assets: DynamicAsset[]) {
  // dedupe by host
  const byHost = new Map<string, DynamicAsset>();
  for (const a of assets) {
    const prev = byHost.get(a.host);
    if (!prev) {
      byHost.set(a.host, a);
      continue;
    }
    const sources = [...new Set([...prev.sources, ...a.sources])];
    byHost.set(a.host, {
      ...prev,
      ...a,
      sources,
      live: a.live ?? prev.live,
      lastScannedAt: a.lastScannedAt || prev.lastScannedAt,
    });
  }
  assetsByProgram.set(programId, [...byHost.values()]);
  return listProgramAssets(programId);
}

export function listAllAssets(): DynamicAsset[] {
  const all: DynamicAsset[] = [];
  for (const rows of assetsByProgram.values()) all.push(...rows);
  return all.sort((a, b) => a.host.localeCompare(b.host));
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
        "Bug bounty search/find/restore on program in-scope roots. Dynamic discovery expands *.domain and seeds into all related sites (CT, DNS prefixes, sitemaps) still within ROE. Not unauthorized internet-wide scanning.",
      dynamic:
        "Discover all sites under scope, then Scan all dynamically. Wildcards (*.example.com) recommended.",
      dualControlElevated:
        "Destructive restore automation stays manual steps + verify probes.",
    },
    programs: listPrograms(),
    findings: listFindings(undefined, 200),
    restores: listRestores(40),
    assets: listAllAssets(),
  };
}
