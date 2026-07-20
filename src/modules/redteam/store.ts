/**
 * Red Team roster + engagement store (in-memory with seed defaults).
 */

import { uid } from "@/lib/utils";
import {
  ENGAGEMENT_TYPE_META,
  type AllowedActivity,
  type EngagementStatus,
  type EngagementType,
  type RedTeamEngagement,
  type RosterMember,
  type RosterRole,
} from "@/modules/redteam/types";

const roster = new Map<string, RosterMember>();
const engagements = new Map<string, RedTeamEngagement>();

function seed() {
  if (roster.size) return;
  const now = new Date().toISOString();
  const seeds: Omit<RosterMember, "id" | "createdAt">[] = [
    { name: "Alex Rivera", role: "lead", active: true, notes: "Engagement authority" },
    { name: "Sam Okonkwo", role: "recon", active: true },
    { name: "Jordan Lee", role: "osint", active: true },
    { name: "Casey Nguyen", role: "analyst", active: true },
    { name: "Riley Shah", role: "scribe", active: true },
    { name: "Morgan Blake", role: "observer", active: true, notes: "Compliance observer" },
  ];
  for (const s of seeds) {
    const id = uid("rtm");
    roster.set(id, { ...s, id, createdAt: now });
  }
}

seed();

export function listRoster(): RosterMember[] {
  seed();
  return [...roster.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRosterMember(id: string): RosterMember | undefined {
  return roster.get(id);
}

export function upsertRosterMember(input: {
  id?: string;
  name: string;
  role: RosterRole;
  email?: string;
  active?: boolean;
  notes?: string;
}): RosterMember {
  seed();
  const id = input.id || uid("rtm");
  const existing = roster.get(id);
  const member: RosterMember = {
    id,
    name: input.name.trim(),
    role: input.role,
    email: input.email,
    active: input.active ?? true,
    notes: input.notes,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  roster.set(id, member);
  return member;
}

export function listEngagements(limit = 50): RedTeamEngagement[] {
  return [...engagements.values()]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, limit);
}

export function getEngagement(id: string): RedTeamEngagement | undefined {
  return engagements.get(id);
}

export function createEngagement(input: {
  name: string;
  type: EngagementType;
  objective: string;
  target?: string;
  rosterIds?: string[];
}): RedTeamEngagement {
  seed();
  const meta = ENGAGEMENT_TYPE_META[input.type];
  const now = new Date().toISOString();
  const id = uid("rte");
  const eng: RedTeamEngagement = {
    id,
    shortId: id.slice(-8),
    name: input.name.trim(),
    type: input.type,
    status: "draft",
    target: input.target?.trim(),
    objective: input.objective.trim(),
    labOnly: meta.labOnly,
    allowedActivities: [...meta.allowed] as AllowedActivity[],
    rosterIds:
      input.rosterIds?.length
        ? input.rosterIds
        : listRoster()
            .filter((m) => m.active)
            .map((m) => m.id),
    findings: [],
    phases: [
      {
        id: uid("rtp"),
        phase: "created",
        status: "ok",
        message: `Engagement draft · type ${input.type}`,
        ts: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  engagements.set(id, eng);
  return eng;
}

export function touchEngagement(eng: RedTeamEngagement) {
  eng.updatedAt = new Date().toISOString();
  engagements.set(eng.id, eng);
  return eng;
}

export function setEngagementStatus(
  eng: RedTeamEngagement,
  status: EngagementStatus,
  message?: string
) {
  eng.status = status;
  if (message) {
    eng.phases.push({
      id: uid("rtp"),
      phase: status,
      status: status === "blocked" ? "blocked" : "ok",
      message,
      ts: new Date().toISOString(),
    });
  }
  if (status === "closed") eng.closedAt = new Date().toISOString();
  return touchEngagement(eng);
}

export function attestRoe(
  eng: RedTeamEngagement,
  input: {
    engagementId: string;
    legalBasis: string;
    scopeSummary: string;
    inScopeTargets: string[];
    outOfScope?: string[];
    expiresAt: string;
    allowPrivateTargets?: boolean;
    attestedBy: string;
  }
): RedTeamEngagement {
  eng.roe = {
    engagementId: input.engagementId.trim(),
    legalBasis: input.legalBasis.trim(),
    scopeSummary: input.scopeSummary.trim(),
    inScopeTargets: input.inScopeTargets.map((t) => t.trim()).filter(Boolean),
    outOfScope: (input.outOfScope || []).map((t) => t.trim()).filter(Boolean),
    expiresAt: input.expiresAt,
    allowPrivateTargets: Boolean(input.allowPrivateTargets && eng.labOnly),
    attestedBy: input.attestedBy.trim(),
    attestedAt: new Date().toISOString(),
  };
  return setEngagementStatus(
    eng,
    "roe_attested",
    `ROE attested by ${eng.roe.attestedBy} · ${eng.roe.engagementId}`
  );
}

export function snapshot() {
  return {
    policy: {
      scope:
        "Authorized recon, public OSINT, lab observation, and reporting only. No exploit kits, phishing, deauth inject, ATT&CK campaign runners, or purple-team boards.",
      forbidden: [
        "exploit_generation",
        "phishing",
        "sms_spoof",
        "deauth_injection",
        "wireless_jamming",
        "attck_campaign_runner",
      ],
    },
    roster: listRoster(),
    engagements: listEngagements(80),
    types: ENGAGEMENT_TYPE_META,
  };
}
