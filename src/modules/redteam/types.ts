/**
 * Red Team engagement model — ROE-scoped recon / OSINT / reporting only.
 * Explicitly excludes offensive kits, ATT&CK campaign runners, purple boards,
 * and separate Red/Blue workspaces.
 */

export type EngagementType =
  | "external_recon"
  | "internal_lab"
  | "web_surface"
  | "wireless_lab_observe"
  | "reporting_only";

export type EngagementStatus =
  | "draft"
  | "roe_attested"
  | "active"
  | "recon_running"
  | "reporting"
  | "closed"
  | "blocked";

export type RosterRole =
  | "lead"
  | "recon"
  | "osint"
  | "analyst"
  | "scribe"
  | "observer";

export type AllowedActivity =
  | "osint.public"
  | "scrape.surface"
  | "scrape.deep"
  | "lab.observe"
  | "report.generate"
  | "mission.orchestrate";

/** Hard refusals — never offered as engagement options */
export const FORBIDDEN_ACTIVITIES = [
  "exploit_generation",
  "payload_weaponization",
  "phishing",
  "sms_spoof",
  "credential_harvest",
  "deauth_injection",
  "wireless_jamming",
  "unauthorized_access",
  "attck_campaign_runner",
  "ttp_playbook_offensive",
] as const;

export interface RosterMember {
  id: string;
  name: string;
  role: RosterRole;
  email?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface EngagementRoe {
  engagementId: string;
  legalBasis: string;
  scopeSummary: string;
  inScopeTargets: string[];
  outOfScope: string[];
  expiresAt: string;
  allowPrivateTargets: boolean;
  attestedBy: string;
  attestedAt: string;
}

export interface EngagementFinding {
  id: string;
  source: "osint" | "scrape" | "lab" | "report" | "operator";
  title: string;
  summary: string;
  severity: "info" | "low" | "medium" | "high";
  ts: string;
  artifacts?: unknown;
}

export interface EngagementPhaseLog {
  id: string;
  phase: string;
  status: "ok" | "blocked" | "failed" | "skipped";
  message: string;
  ts: string;
}

export interface RedTeamEngagement {
  id: string;
  shortId: string;
  name: string;
  type: EngagementType;
  status: EngagementStatus;
  target?: string;
  objective: string;
  labOnly: boolean;
  allowedActivities: AllowedActivity[];
  rosterIds: string[];
  roe?: EngagementRoe;
  findings: EngagementFinding[];
  phases: EngagementPhaseLog[];
  report?: string;
  hermesRunId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  blockReason?: string;
}

export const ENGAGEMENT_TYPE_META: Record<
  EngagementType,
  {
    label: string;
    description: string;
    allowed: AllowedActivity[];
    labOnly: boolean;
    requiresRoe: boolean;
  }
> = {
  external_recon: {
    label: "External recon",
    description: "Public OSINT + surface crawl under signed ROE",
    allowed: ["osint.public", "scrape.surface", "report.generate", "mission.orchestrate"],
    labOnly: false,
    requiresRoe: true,
  },
  internal_lab: {
    label: "Internal lab",
    description: "Isolated lab targets only (private nets explicitly allowed)",
    allowed: [
      "osint.public",
      "scrape.surface",
      "scrape.deep",
      "lab.observe",
      "report.generate",
      "mission.orchestrate",
    ],
    labOnly: true,
    requiresRoe: true,
  },
  web_surface: {
    label: "Web surface",
    description: "Authorized same-origin surface mapping and tech fingerprint",
    allowed: ["scrape.surface", "scrape.deep", "report.generate"],
    labOnly: false,
    requiresRoe: true,
  },
  wireless_lab_observe: {
    label: "Wireless lab (observe)",
    description: "Passive / software lab observation only — no OTA inject or deauth",
    allowed: ["lab.observe", "report.generate"],
    labOnly: true,
    requiresRoe: true,
  },
  reporting_only: {
    label: "Reporting only",
    description: "Synthesize executive/technical report from prior findings",
    allowed: ["report.generate"],
    labOnly: false,
    requiresRoe: false,
  },
};

export const ROSTER_ROLE_META: Record<RosterRole, string> = {
  lead: "Engagement lead",
  recon: "Surface recon",
  osint: "Public intelligence",
  analyst: "Correlation analyst",
  scribe: "Report scribe",
  observer: "Observer (read-only)",
};
