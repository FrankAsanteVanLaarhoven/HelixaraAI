/**
 * Elevated capability authorization — owner & superadmin only, dual-control.
 *
 * Capabilities that were "permanently off" for operators stay locked until:
 * 1. Role verified as owner OR superadmin (token + identity)
 * 2. Dual-control: BOTH owner and superadmin approve the capability
 * 3. Optional expiry + engagement id binding
 *
 * Regular operators cannot authorize or use elevated paths.
 */

import { createHash, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { uid } from "@/lib/utils";

export type ElevatedRole = "owner" | "superadmin" | "operator";

export type ElevatedCapabilityId =
  | "exploit_payload_live"
  | "phishing_live_host"
  | "sms_spoof_send"
  | "rf_ota_inject"
  | "attack_chain_live"
  | "purple_live_orchestrate";

export const ELEVATED_CAPABILITIES: Record<
  ElevatedCapabilityId,
  {
    label: string;
    description: string;
    risk: "critical";
    requiresDualControl: true;
  }
> = {
  exploit_payload_live: {
    label: "Exploit / payload live lab",
    description:
      "Authorize elevated payload research path under ROE (owner + superadmin).",
    risk: "critical",
    requiresDualControl: true,
  },
  phishing_live_host: {
    label: "Phishing live host",
    description:
      "Authorize live phishing campaign host for in-scope awareness only.",
    risk: "critical",
    requiresDualControl: true,
  },
  sms_spoof_send: {
    label: "SMS spoof / send",
    description:
      "Authorize SMS send path via configured gateway for authorized drills only.",
    risk: "critical",
    requiresDualControl: true,
  },
  rf_ota_inject: {
    label: "RF OTA deauth / inject",
    description:
      "Authorize OTA RF path (external authorized gear adapter) — dual control.",
    risk: "critical",
    requiresDualControl: true,
  },
  attack_chain_live: {
    label: "ATT&CK live campaign runner",
    description: "Authorize elevated campaign execution mode under ROE.",
    risk: "critical",
    requiresDualControl: true,
  },
  purple_live_orchestrate: {
    label: "Purple live orchestrate",
    description: "Authorize live purple-team orchestration beyond tabletop.",
    risk: "critical",
    requiresDualControl: true,
  },
};

export interface RoleSession {
  sessionId: string;
  role: ElevatedRole;
  identity: string;
  verifiedAt: string;
  expiresAt: string;
}

export interface CapabilityApproval {
  role: "owner" | "superadmin";
  identity: string;
  verifiedAt: string;
  note?: string;
}

export interface ElevatedGrant {
  capability: ElevatedCapabilityId;
  status: "locked" | "pending" | "authorized" | "revoked";
  engagementId?: string;
  legalBasis?: string;
  expiresAt?: string;
  approvals: CapabilityApproval[];
  authorizedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  audit: { ts: string; action: string; by: string; detail?: string }[];
}

interface ElevatedState {
  grants: Record<ElevatedCapabilityId, ElevatedGrant>;
  sessions: RoleSession[];
}

function defaultGrant(cap: ElevatedCapabilityId): ElevatedGrant {
  return {
    capability: cap,
    status: "locked",
    approvals: [],
    audit: [
      {
        ts: new Date().toISOString(),
        action: "init",
        by: "system",
        detail: "locked by default — owner + superadmin dual control required",
      },
    ],
  };
}

function emptyState(): ElevatedState {
  const grants = {} as Record<ElevatedCapabilityId, ElevatedGrant>;
  for (const id of Object.keys(ELEVATED_CAPABILITIES) as ElevatedCapabilityId[]) {
    grants[id] = defaultGrant(id);
  }
  return { grants, sessions: [] };
}

let state: ElevatedState = emptyState();
let loaded = false;

function stateFile() {
  return path.join(process.cwd(), "data", "auth", "elevated.json");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Configured secrets (env). Empty = role disabled until set. */
export function roleSecrets() {
  return {
    ownerConfigured: Boolean(process.env.HELIXARA_OWNER_TOKEN),
    superadminConfigured: Boolean(process.env.HELIXARA_SUPERADMIN_TOKEN),
    /** Demo bootstrap only when HELIXARA_ALLOW_DEMO_ELEVATED=1 */
    demoElevated:
      process.env.HELIXARA_ALLOW_DEMO_ELEVATED === "1" ||
      process.env.HELIXARA_ALLOW_DEMO_ELEVATED === "true",
  };
}

function expectedTokenHash(role: "owner" | "superadmin"): string | null {
  const raw =
    role === "owner"
      ? process.env.HELIXARA_OWNER_TOKEN
      : process.env.HELIXARA_SUPERADMIN_TOKEN;
  if (raw && raw.length >= 8) return hashToken(raw);
  // Demo tokens only when explicitly enabled
  if (roleSecrets().demoElevated) {
    const demo =
      role === "owner" ? "helixara-owner-demo-change-me" : "helixara-superadmin-demo-change-me";
    return hashToken(demo);
  }
  return null;
}

export async function loadElevatedState(): Promise<ElevatedState> {
  if (loaded) return state;
  try {
    const raw = await fs.readFile(stateFile(), "utf8");
    const parsed = JSON.parse(raw) as ElevatedState;
    const base = emptyState();
    for (const id of Object.keys(base.grants) as ElevatedCapabilityId[]) {
      base.grants[id] = parsed.grants?.[id]
        ? { ...defaultGrant(id), ...parsed.grants[id] }
        : defaultGrant(id);
    }
    base.sessions = (parsed.sessions || []).filter(
      (s) => new Date(s.expiresAt).getTime() > Date.now()
    );
    state = base;
  } catch {
    state = emptyState();
  }
  loaded = true;
  return state;
}

async function persist() {
  const dir = path.dirname(stateFile());
  await fs.mkdir(dir, { recursive: true });
  // do not persist sessions long-term secrets — sessions ok to persist short lived
  await fs.writeFile(stateFile(), JSON.stringify(state, null, 2), "utf8");
}

function pruneSessions() {
  const now = Date.now();
  state.sessions = state.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
}

export function getSession(sessionId: string | undefined | null): RoleSession | null {
  if (!sessionId) return null;
  pruneSessions();
  return state.sessions.find((s) => s.sessionId === sessionId) || null;
}

/** Verify owner or superadmin with token. Operators always fail elevated verify. */
export async function verifyElevatedRole(input: {
  role: ElevatedRole;
  identity: string;
  token: string;
  ttlMinutes?: number;
}): Promise<
  | { ok: true; session: RoleSession }
  | { ok: false; reason: string }
> {
  await loadElevatedState();
  if (input.role === "operator") {
    return {
      ok: false,
      reason: "Operators cannot verify elevated roles. Owner or superadmin only.",
    };
  }
  if (!input.identity.trim()) {
    return { ok: false, reason: "identity required" };
  }
  const expected = expectedTokenHash(input.role);
  if (!expected) {
    return {
      ok: false,
      reason:
        `No ${input.role} token configured. Set HELIXARA_${input.role.toUpperCase()}_TOKEN or HELIXARA_ALLOW_DEMO_ELEVATED=1 for lab demo.`,
    };
  }
  const provided = hashToken(input.token || "");
  if (!safeEqualHex(provided, expected)) {
    return { ok: false, reason: "invalid token — verification failed" };
  }

  pruneSessions();
  // one active session per role+identity
  state.sessions = state.sessions.filter(
    (s) => !(s.role === input.role && s.identity === input.identity.trim())
  );
  const ttl = Math.min(Math.max(input.ttlMinutes ?? 60, 5), 24 * 60);
  const session: RoleSession = {
    sessionId: uid("esess"),
    role: input.role,
    identity: input.identity.trim(),
    verifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl * 60_000).toISOString(),
  };
  state.sessions.push(session);
  await persist();
  return { ok: true, session };
}

export async function revokeSession(sessionId: string) {
  await loadElevatedState();
  state.sessions = state.sessions.filter((s) => s.sessionId !== sessionId);
  await persist();
}

function isOwnerOrSuperadmin(session: RoleSession | null): session is RoleSession & {
  role: "owner" | "superadmin";
} {
  return Boolean(session && (session.role === "owner" || session.role === "superadmin"));
}

function recomputeStatus(grant: ElevatedGrant): ElevatedGrant {
  if (grant.status === "revoked") return grant;
  if (grant.expiresAt && new Date(grant.expiresAt).getTime() < Date.now()) {
    grant.status = "locked";
    grant.approvals = [];
    grant.authorizedAt = undefined;
    grant.audit.push({
      ts: new Date().toISOString(),
      action: "expired",
      by: "system",
    });
    return grant;
  }
  const hasOwner = grant.approvals.some((a) => a.role === "owner");
  const hasSa = grant.approvals.some((a) => a.role === "superadmin");
  if (hasOwner && hasSa) {
    grant.status = "authorized";
    if (!grant.authorizedAt) grant.authorizedAt = new Date().toISOString();
  } else if (hasOwner || hasSa) {
    grant.status = "pending";
  } else {
    grant.status = "locked";
    grant.authorizedAt = undefined;
  }
  return grant;
}

/** Approve a capability — only verified owner/superadmin sessions. Dual control required. */
export async function approveCapability(input: {
  sessionId: string;
  capability: ElevatedCapabilityId;
  engagementId: string;
  legalBasis: string;
  expiresAt: string;
  note?: string;
}): Promise<
  | { ok: true; grant: ElevatedGrant }
  | { ok: false; reason: string }
> {
  await loadElevatedState();
  const session = getSession(input.sessionId);
  if (!isOwnerOrSuperadmin(session)) {
    return {
      ok: false,
      reason: "Only verified owner or superadmin may authorize elevated capabilities",
    };
  }
  if (!ELEVATED_CAPABILITIES[input.capability]) {
    return { ok: false, reason: "unknown capability" };
  }
  if (!input.engagementId.trim() || !input.legalBasis.trim()) {
    return { ok: false, reason: "engagementId and legalBasis required" };
  }
  if (new Date(input.expiresAt).getTime() <= Date.now()) {
    return { ok: false, reason: "expiresAt must be in the future" };
  }

  const grant = state.grants[input.capability];
  // Replace prior approval from same role
  grant.approvals = grant.approvals.filter((a) => a.role !== session.role);
  grant.approvals.push({
    role: session.role,
    identity: session.identity,
    verifiedAt: new Date().toISOString(),
    note: input.note?.slice(0, 500),
  });
  grant.engagementId = input.engagementId.trim();
  grant.legalBasis = input.legalBasis.trim();
  grant.expiresAt = input.expiresAt;
  grant.revokedAt = undefined;
  grant.revokedBy = undefined;
  grant.audit.push({
    ts: new Date().toISOString(),
    action: "approve",
    by: `${session.role}:${session.identity}`,
    detail: input.note,
  });
  state.grants[input.capability] = recomputeStatus(grant);
  await persist();
  return { ok: true, grant: state.grants[input.capability] };
}

export async function revokeCapability(input: {
  sessionId: string;
  capability: ElevatedCapabilityId;
  reason?: string;
}): Promise<
  | { ok: true; grant: ElevatedGrant }
  | { ok: false; reason: string }
> {
  await loadElevatedState();
  const session = getSession(input.sessionId);
  if (!isOwnerOrSuperadmin(session)) {
    return {
      ok: false,
      reason: "Only verified owner or superadmin may revoke",
    };
  }
  const grant = state.grants[input.capability];
  grant.status = "revoked";
  grant.approvals = [];
  grant.authorizedAt = undefined;
  grant.revokedAt = new Date().toISOString();
  grant.revokedBy = `${session.role}:${session.identity}`;
  grant.audit.push({
    ts: new Date().toISOString(),
    action: "revoke",
    by: grant.revokedBy,
    detail: input.reason,
  });
  await persist();
  return { ok: true, grant };
}

/** Runtime check used by ethical modules */
export async function isCapabilityAuthorized(
  capability: ElevatedCapabilityId
): Promise<{
  authorized: boolean;
  reason: string;
  grant?: ElevatedGrant;
}> {
  await loadElevatedState();
  const grant = recomputeStatus({ ...state.grants[capability] });
  state.grants[capability] = grant;
  if (grant.status !== "authorized") {
    const missing: string[] = [];
    if (!grant.approvals.some((a) => a.role === "owner")) missing.push("owner");
    if (!grant.approvals.some((a) => a.role === "superadmin"))
      missing.push("superadmin");
    return {
      authorized: false,
      reason:
        grant.status === "pending"
          ? `Pending dual-control — still need: ${missing.join(" + ")}`
          : `Capability locked. Requires dual-control authorization by owner AND superadmin after role verification.`,
      grant,
    };
  }
  return { authorized: true, reason: "authorized", grant };
}

export async function getElevatedSnapshot() {
  await loadElevatedState();
  pruneSessions();
  // refresh expiry on all grants
  for (const id of Object.keys(state.grants) as ElevatedCapabilityId[]) {
    state.grants[id] = recomputeStatus(state.grants[id]);
  }
  return {
    policy: {
      dualControl: true,
      authorizers: ["owner", "superadmin"] as const,
      operatorsCannotElevate: true,
      message:
        "Elevated (formerly permanent-off) paths require verified owner AND superadmin approval. Ethical hacking / ROE only.",
    },
    secrets: roleSecrets(),
    capabilities: ELEVATED_CAPABILITIES,
    grants: state.grants,
    activeSessions: state.sessions.map((s) => ({
      sessionId: s.sessionId,
      role: s.role,
      identity: s.identity,
      verifiedAt: s.verifiedAt,
      expiresAt: s.expiresAt,
    })),
  };
}

/** Map old HARD_BLOCK keys to capability ids */
export const BLOCK_TO_CAPABILITY: Record<string, ElevatedCapabilityId> = {
  exploitLive: "exploit_payload_live",
  phishingLive: "phishing_live_host",
  smsSpoof: "sms_spoof_send",
  rfInject: "rf_ota_inject",
};
