/**
 * Bug bounty capabilities — ROE-scoped search, findings, and restore.
 * Only in-scope assets under an attested program. Not unauthorized mass scanning.
 */

export type BountySeverity = "info" | "low" | "medium" | "high" | "critical";

export type FindingStatus =
  | "new"
  | "triaged"
  | "accepted"
  | "restoring"
  | "restored"
  | "verified"
  | "duplicate"
  | "out_of_scope"
  | "closed";

export type RestoreStatus =
  | "planned"
  | "in_progress"
  | "awaiting_verify"
  | "completed"
  | "failed"
  | "rolled_back";

export interface BountyProgram {
  id: string;
  shortId: string;
  name: string;
  /** Organization / asset owner */
  owner: string;
  engagementId: string;
  legalBasis: string;
  /** Domains, hosts, CIDRs as strings — must match before scan */
  inScope: string[];
  outOfScope: string[];
  /** Safe modules allowed */
  allowedChecks: BountyCheckId[];
  maxSeverityAutoAccept: BountySeverity;
  active: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export type BountyCheckId =
  | "http_security_headers"
  | "tls_posture"
  | "dns_hygiene"
  | "open_redirect_hint"
  | "cors_misconfig_hint"
  | "info_disclosure_headers"
  | "cookie_flags"
  | "robots_sitemap_surface"
  | "tech_fingerprint"
  | "restore_health_probe";

export interface BountyFinding {
  id: string;
  shortId: string;
  programId: string;
  target: string;
  checkId: BountyCheckId;
  title: string;
  summary: string;
  severity: BountySeverity;
  status: FindingStatus;
  evidence: Record<string, unknown>;
  remediation: string[];
  restoreJobId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface RestoreStep {
  id: string;
  title: string;
  detail: string;
  status: "pending" | "done" | "skipped" | "failed";
  completedAt?: string;
  note?: string;
}

export interface RestoreJob {
  id: string;
  shortId: string;
  programId: string;
  findingId: string;
  target: string;
  status: RestoreStatus;
  steps: RestoreStep[];
  /** Post-restore probe result */
  verifyOk?: boolean;
  verifyDetail?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const CHECK_META: Record<
  BountyCheckId,
  { label: string; description: string; defaultSeverity: BountySeverity }
> = {
  http_security_headers: {
    label: "HTTP security headers",
    description: "CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy",
    defaultSeverity: "medium",
  },
  tls_posture: {
    label: "TLS posture",
    description: "HTTPS availability and basic certificate presence",
    defaultSeverity: "high",
  },
  dns_hygiene: {
    label: "DNS hygiene",
    description: "A/AAAA resolution and missing records for primary host",
    defaultSeverity: "low",
  },
  open_redirect_hint: {
    label: "Open redirect hints",
    description: "Query param patterns often linked to open redirects (heuristic)",
    defaultSeverity: "medium",
  },
  cors_misconfig_hint: {
    label: "CORS misconfig hints",
    description: "Overly permissive ACAO reflections (heuristic)",
    defaultSeverity: "high",
  },
  info_disclosure_headers: {
    label: "Info disclosure headers",
    description: "Server/X-Powered-By and similar fingerprint leaks",
    defaultSeverity: "info",
  },
  cookie_flags: {
    label: "Cookie flags",
    description: "Secure / HttpOnly / SameSite on Set-Cookie",
    defaultSeverity: "medium",
  },
  robots_sitemap_surface: {
    label: "Robots / sitemap surface",
    description: "Discoverable paths from robots.txt and sitemap.xml",
    defaultSeverity: "info",
  },
  tech_fingerprint: {
    label: "Tech fingerprint",
    description: "Stack hints from headers and HTML markers",
    defaultSeverity: "info",
  },
  restore_health_probe: {
    label: "Restore health probe",
    description: "Post-fix HTTP reachability check",
    defaultSeverity: "info",
  },
};

export const ALL_CHECKS = Object.keys(CHECK_META) as BountyCheckId[];
