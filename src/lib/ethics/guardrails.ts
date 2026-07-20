/**
 * HelixaraAI Ethics & Authorization Guardrails
 * ---------------------------------------
 * Every high-impact operation must pass these checks.
 * This platform is for authorized, lawful OSINT and defensive security only.
 */

import { isPrivateOrLocalHost, safeHost } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "blocked";

export type AuthScope =
  | "osint.public"
  | "scrape.surface"
  | "scrape.deep"
  | "mission.read"
  | "mission.write"
  | "audit.read"
  | "geospatial.read"
  | "agent.orchestrate"
  | "redteam.engage"
  | "bounty.scan"
  | "bounty.restore"
  | "darkweb.authorized"; // requires explicit operator attestation + legal token

export interface AuthorizationContext {
  operatorId: string;
  scopes: AuthScope[];
  /** Human attestation that activity is authorized (engagement letter / ROE) */
  engagementId?: string;
  /** Legal basis note (e.g. "internal lab", "signed pentest SOW #42") */
  legalBasis?: string;
  /** ISO timestamp when attestation expires */
  expiresAt?: string;
  /** Force allow private/lab targets when explicitly scoped */
  allowPrivateTargets?: boolean;
}

export interface GuardrailDecision {
  allowed: boolean;
  risk: RiskLevel;
  reasons: string[];
  requiredScopes: AuthScope[];
  recommendations: string[];
}

const BLOCKED_PATH_PATTERNS = [
  /\/admin/i,
  /\/wp-login/i,
  /\/\.env/i,
  /\/\.git/i,
  /\/phpmyadmin/i,
  /\/actuator\/env/i,
];

const HIGH_RISK_TLDS = [".onion"];

export function hasScope(ctx: AuthorizationContext, scope: AuthScope): boolean {
  return ctx.scopes.includes(scope);
}

export function evaluateScrapeTarget(
  url: string,
  ctx: AuthorizationContext,
  opts: { deep?: boolean; respectRobots?: boolean } = {}
): GuardrailDecision {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const required: AuthScope[] = opts.deep ? ["scrape.deep"] : ["scrape.surface"];

  const host = safeHost(url);
  if (!host) {
    return {
      allowed: false,
      risk: "blocked",
      reasons: ["Invalid URL"],
      requiredScopes: required,
      recommendations: ["Provide a valid http(s) URL"],
    };
  }

  // Scope gate
  for (const s of required) {
    if (!hasScope(ctx, s)) {
      reasons.push(`Missing authorization scope: ${s}`);
    }
  }

  // Engagement attestation for deep / high-impact
  if (opts.deep && (!ctx.engagementId || !ctx.legalBasis)) {
    reasons.push("Deep scrape requires engagementId + legalBasis attestation");
    recommendations.push("Attach signed ROE / SOW reference before deep crawl");
  }

  if (ctx.expiresAt && new Date(ctx.expiresAt).getTime() < Date.now()) {
    reasons.push("Authorization attestation expired");
  }

  // SSRF / private network protection
  if (isPrivateOrLocalHost(host) && !ctx.allowPrivateTargets) {
    reasons.push("Private/local targets blocked (SSRF protection)");
    recommendations.push("Enable allowPrivateTargets only inside isolated lab nets");
  }

  // Onion / dark-web requires dedicated scope + attestation
  if (HIGH_RISK_TLDS.some((t) => host.endsWith(t))) {
    required.push("darkweb.authorized");
    if (!hasScope(ctx, "darkweb.authorized")) {
      reasons.push("Dark-web (.onion) targets require darkweb.authorized scope");
    }
    if (!ctx.engagementId || !ctx.legalBasis) {
      reasons.push("Dark-web access requires explicit legal attestation");
    }
  }

  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) {
      reasons.push(`Unsupported protocol: ${u.protocol}`);
    }
    if (BLOCKED_PATH_PATTERNS.some((p) => p.test(u.pathname))) {
      reasons.push("Path matches high-risk pattern (credential/config surface)");
      recommendations.push("Use passive OSINT first; avoid direct credential endpoints");
    }
  } catch {
    reasons.push("URL parse failure");
  }

  if (opts.respectRobots !== false) {
    recommendations.push("robots.txt will be honored unless override is logged + justified");
  }

  const risk: RiskLevel =
    reasons.length > 0
      ? "blocked"
      : host.endsWith(".onion")
        ? "high"
        : opts.deep
          ? "medium"
          : "low";

  return {
    allowed: reasons.length === 0,
    risk,
    reasons,
    requiredScopes: required,
    recommendations,
  };
}

export function evaluateOsintQuery(
  query: string,
  ctx: AuthorizationContext
): GuardrailDecision {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const required: AuthScope[] = ["osint.public"];

  if (!hasScope(ctx, "osint.public")) {
    reasons.push("Missing scope osint.public");
  }
  if (!query || query.trim().length < 2) {
    reasons.push("Query too short");
  }
  // Block obvious credential / exploit shopping language
  const banned = [
    /\b(zero[\s-]?day exploit)\b/i,
    /\b(ransomware builder)\b/i,
    /\b(carding dumps?)\b/i,
    /\b(stolen credentials?)\b/i,
  ];
  if (banned.some((b) => b.test(query))) {
    reasons.push("Query matches prohibited criminal-market language");
    recommendations.push("Use defensive IOC / public threat-intel phrasing only");
  }

  return {
    allowed: reasons.length === 0,
    risk: reasons.length ? "blocked" : "low",
    reasons,
    requiredScopes: required,
    recommendations,
  };
}

/** Default operator for local demo — scopes are intentionally conservative */
export function demoOperator(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    operatorId: "operator.demo",
    scopes: [
      "osint.public",
      "scrape.surface",
      "scrape.deep",
      "mission.read",
      "mission.write",
      "audit.read",
      "geospatial.read",
      "agent.orchestrate",
      "redteam.engage",
      "bounty.scan",
      "bounty.restore",
    ],
    engagementId: "DEMO-LAB-001",
    legalBasis: "Local authorized lab / demonstration only",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    allowPrivateTargets: false,
    ...overrides,
  };
}

export const ETHICS_NOTICE = `
HELIXARA AI — AUTHORIZED USE ONLY

This system is designed for lawful OSINT, authorized security testing, and
defensive threat intelligence under a documented Rules of Engagement (ROE).

Prohibited without explicit legal authority:
- Unauthorized access to systems you do not own or have permission to test
- Dark-web marketplace abuse, credential theft, or criminal facilitation
- Wireless attacks (deauth, cracking) against third-party networks
- Exploit/payload weaponization for offensive use outside ROE

All sensitive actions are audited. Operators accept legal responsibility
for compliance with applicable law (CFAA, CMA 1990, GDPR/UK DPA, etc.).
`.trim();
