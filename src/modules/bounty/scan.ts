/**
 * Safe surface bug-finding checks for bounty programs.
 * Passive/heuristic only — no exploit payloads, no brute force, no auth bypass.
 */

import { uid } from "@/lib/utils";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";
import { emitEvent } from "@/modules/events/bus";
import { getProgram, saveFinding } from "@/modules/bounty/store";
import { isInScope, toHttpsUrl } from "@/modules/bounty/scope";
import {
  CHECK_META,
  type BountyCheckId,
  type BountyFinding,
  type BountySeverity,
} from "@/modules/bounty/types";

function findingBase(
  programId: string,
  target: string,
  checkId: BountyCheckId,
  partial: Omit<
    BountyFinding,
    | "id"
    | "shortId"
    | "programId"
    | "target"
    | "checkId"
    | "status"
    | "createdAt"
    | "updatedAt"
  >
): BountyFinding {
  const id = uid("bfind");
  const now = new Date().toISOString();
  return {
    id,
    shortId: id.slice(-8),
    programId,
    target,
    checkId,
    status: "new",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

async function fetchSafe(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(12_000),
    headers: {
      "User-Agent": "HelixaraAI-Bounty/0.2 (+authorized-scope; ethical)",
      ...(init?.headers || {}),
    },
  });
}

async function checkHttpHeaders(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const url = toHttpsUrl(target);
  const out: BountyFinding[] = [];
  try {
    const res = await fetchSafe(url, { method: "GET" });
    const h = res.headers;
    const missing: string[] = [];
    const want = [
      "strict-transport-security",
      "content-security-policy",
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
    ];
    for (const k of want) {
      if (!h.get(k)) missing.push(k);
    }
    if (missing.length) {
      out.push(
        findingBase(programId, target, "http_security_headers", {
          title: `Missing security headers (${missing.length})`,
          summary: `Response missing: ${missing.join(", ")}`,
          severity: missing.includes("strict-transport-security")
            ? "medium"
            : "low",
          evidence: {
            url,
            status: res.status,
            missing,
            present: want.filter((k) => h.get(k)),
          },
          remediation: [
            "Add Strict-Transport-Security with appropriate max-age",
            "Define Content-Security-Policy tailored to the app",
            "Set X-Content-Type-Options: nosniff",
            "Set X-Frame-Options or CSP frame-ancestors",
            "Set Referrer-Policy",
          ],
        })
      );
    }
  } catch (e) {
    out.push(
      findingBase(programId, target, "http_security_headers", {
        title: "HTTP header check failed",
        summary: e instanceof Error ? e.message : "fetch failed",
        severity: "info",
        evidence: { url, error: String(e) },
        remediation: ["Confirm host is reachable from scanner network"],
      })
    );
  }
  return out;
}

async function checkTls(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const https = toHttpsUrl(target);
  const http = https.replace(/^https:/, "http:");
  const out: BountyFinding[] = [];
  try {
    const res = await fetchSafe(https, { method: "GET" });
    if (res.status === 0 || res.type === "error") {
      /* ignore */
    }
    // If HTTPS works, optional HTTP availability as info
    try {
      const hres = await fetchSafe(http, { method: "GET" });
      if (hres.status > 0 && hres.status < 400) {
        out.push(
          findingBase(programId, target, "tls_posture", {
            title: "HTTP still serves content",
            summary:
              "Cleartext HTTP responded successfully — ensure redirect to HTTPS and HSTS.",
            severity: "medium",
            evidence: { httpStatus: hres.status, httpsStatus: res.status },
            remediation: [
              "301/308 redirect all HTTP to HTTPS",
              "Enable HSTS after verifying HTTPS estate",
            ],
          })
        );
      }
    } catch {
      /* http down is fine */
    }
  } catch (e) {
    out.push(
      findingBase(programId, target, "tls_posture", {
        title: "HTTPS not reachable",
        summary: e instanceof Error ? e.message : "HTTPS failed",
        severity: "high",
        evidence: { https, error: String(e) },
        remediation: [
          "Provision valid TLS certificate",
          "Ensure listener on 443 and correct SNI",
        ],
      })
    );
  }
  return out;
}

async function checkDns(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const host = target
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .toLowerCase();
  const out: BountyFinding[] = [];
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) throw new Error(`DoH HTTP ${res.status}`);
    const data = (await res.json()) as {
      Answer?: { data: string; type: number }[];
    };
    const ips = (data.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
    if (!ips.length) {
      out.push(
        findingBase(programId, target, "dns_hygiene", {
          title: `No A records for ${host}`,
          summary: "Primary host did not resolve A records via public DoH.",
          severity: "low",
          evidence: { host, data },
          remediation: ["Publish correct DNS A/AAAA or CDN alias records"],
        })
      );
    }
  } catch (e) {
    out.push(
      findingBase(programId, target, "dns_hygiene", {
        title: "DNS check error",
        summary: e instanceof Error ? e.message : "dns failed",
        severity: "info",
        evidence: { host, error: String(e) },
        remediation: ["Retry DNS check; verify resolver path"],
      })
    );
  }
  return out;
}

async function checkInfoHeaders(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const url = toHttpsUrl(target);
  const out: BountyFinding[] = [];
  try {
    const res = await fetchSafe(url);
    const leaks: Record<string, string> = {};
    for (const k of ["server", "x-powered-by", "x-aspnet-version", "x-generator"]) {
      const v = res.headers.get(k);
      if (v) leaks[k] = v;
    }
    if (Object.keys(leaks).length) {
      out.push(
        findingBase(programId, target, "info_disclosure_headers", {
          title: "Technology disclosure headers",
          summary: `Headers reveal stack: ${Object.entries(leaks)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")}`,
          severity: "info",
          evidence: { url, leaks },
          remediation: [
            "Remove or genericize Server / X-Powered-By headers",
            "Keep versions out of public responses",
          ],
        })
      );
    }
  } catch {
    /* skip */
  }
  return out;
}

async function checkCookies(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const url = toHttpsUrl(target);
  const out: BountyFinding[] = [];
  try {
    const res = await fetchSafe(url);
    const raw =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    const cookies =
      raw.length > 0
        ? raw
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie") as string]
          : [];
    const weak: string[] = [];
    for (const c of cookies) {
      const lower = c.toLowerCase();
      if (!lower.includes("secure")) weak.push("missing Secure");
      if (!lower.includes("httponly")) weak.push("missing HttpOnly");
      if (!lower.includes("samesite")) weak.push("missing SameSite");
    }
    if (cookies.length && weak.length) {
      out.push(
        findingBase(programId, target, "cookie_flags", {
          title: "Weak cookie flags",
          summary: [...new Set(weak)].join("; "),
          severity: "medium",
          evidence: { url, cookies: cookies.map((c) => c.slice(0, 120)) },
          remediation: [
            "Set Secure; HttpOnly; SameSite=Lax or Strict on session cookies",
          ],
        })
      );
    }
  } catch {
    /* skip */
  }
  return out;
}

async function checkCors(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const url = toHttpsUrl(target);
  const out: BountyFinding[] = [];
  try {
    const origin = "https://evil.example";
    const res = await fetchSafe(url, {
      headers: { Origin: origin },
    });
    const acao = res.headers.get("access-control-allow-origin");
    const acac = res.headers.get("access-control-allow-credentials");
    if (acao === "*" || acao === origin) {
      out.push(
        findingBase(programId, target, "cors_misconfig_hint", {
          title: "Permissive CORS hint",
          summary: `ACAO=${acao}${acac ? ` · credentials=${acac}` : ""}`,
          severity: acao === origin && acac === "true" ? "high" : "medium",
          evidence: { url, acao, acac, probeOrigin: origin },
          remediation: [
            "Reflect only trusted origins",
            "Avoid ACAO * with credentials",
            "Maintain explicit allowlist",
          ],
        })
      );
    }
  } catch {
    /* skip */
  }
  return out;
}

async function checkRobots(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const base = toHttpsUrl(target).replace(/\/$/, "");
  const out: BountyFinding[] = [];
  try {
    const res = await fetchSafe(`${base}/robots.txt`);
    if (res.ok) {
      const text = await res.text();
      const disallows = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^disallow:/i.test(l))
        .slice(0, 30);
      if (disallows.length) {
        out.push(
          findingBase(programId, target, "robots_sitemap_surface", {
            title: "robots.txt surface paths",
            summary: `${disallows.length} Disallow rules (informational surface map)`,
            severity: "info",
            evidence: { disallows: disallows.slice(0, 20), sample: text.slice(0, 800) },
            remediation: [
              "Do not rely on robots.txt for secrecy",
              "Authenticate sensitive paths; remove from public crawl surface if needed",
            ],
          })
        );
      }
    }
  } catch {
    /* skip */
  }
  return out;
}

async function checkTech(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const url = toHttpsUrl(target);
  const out: BountyFinding[] = [];
  try {
    const res = await fetchSafe(url);
    const html = (await res.text()).slice(0, 50_000);
    const techs: string[] = [];
    if (/wp-content|wordpress/i.test(html)) techs.push("WordPress");
    if (/react|__NEXT_DATA__|next\.js/i.test(html)) techs.push("React/Next");
    if (/cdn\.jsdelivr|cloudflare/i.test(html)) techs.push("CDN assets");
    if (res.headers.get("x-powered-by")) {
      techs.push(`X-Powered-By: ${res.headers.get("x-powered-by")}`);
    }
    if (techs.length) {
      out.push(
        findingBase(programId, target, "tech_fingerprint", {
          title: "Technology fingerprint",
          summary: techs.join(", "),
          severity: "info",
          evidence: { techs, status: res.status },
          remediation: [
            "Track CVEs for identified stacks",
            "Keep frameworks patched under change control",
          ],
        })
      );
    }
  } catch {
    /* skip */
  }
  return out;
}

async function checkOpenRedirectHint(
  programId: string,
  target: string
): Promise<BountyFinding[]> {
  const base = toHttpsUrl(target).replace(/\/$/, "");
  const out: BountyFinding[] = [];
  // Heuristic only: probe common param names, observe redirect Location
  const probes = [
    `${base}/?next=https://example.org`,
    `${base}/?url=https://example.org`,
    `${base}/?redirect=https://example.org`,
  ];
  for (const p of probes) {
    try {
      const res = await fetchSafe(p);
      const loc = res.headers.get("location") || "";
      if (
        (res.status === 301 || res.status === 302 || res.status === 307) &&
        /example\.org/i.test(loc)
      ) {
        out.push(
          findingBase(programId, target, "open_redirect_hint", {
            title: "Possible open redirect",
            summary: `Redirected to external Location from ${p}`,
            severity: "medium",
            evidence: { probe: p, status: res.status, location: loc },
            remediation: [
              "Allowlist redirect targets",
              "Prefer relative paths; reject absolute external URLs",
            ],
          })
        );
        break;
      }
    } catch {
      /* skip probe */
    }
  }
  return out;
}

const RUNNERS: Record<
  BountyCheckId,
  (programId: string, target: string) => Promise<BountyFinding[]>
> = {
  http_security_headers: checkHttpHeaders,
  tls_posture: checkTls,
  dns_hygiene: checkDns,
  open_redirect_hint: checkOpenRedirectHint,
  cors_misconfig_hint: checkCors,
  info_disclosure_headers: checkInfoHeaders,
  cookie_flags: checkCookies,
  robots_sitemap_surface: checkRobots,
  tech_fingerprint: checkTech,
  restore_health_probe: async () => [],
};

export async function runBountyScan(input: {
  programId: string;
  target: string;
  checks?: BountyCheckId[];
}): Promise<{
  ok: boolean;
  reason?: string;
  findings: BountyFinding[];
  host?: string;
}> {
  const program = getProgram(input.programId);
  if (!program) return { ok: false, reason: "program not found", findings: [] };

  const scope = isInScope(program, input.target);
  if (!scope.ok) return { ok: false, reason: scope.reason, findings: [] };

  const checks = (input.checks?.length
    ? input.checks
    : program.allowedChecks
  ).filter((c) => c !== "restore_health_probe");

  const collected: BountyFinding[] = [];
  for (const check of checks) {
    if (!program.allowedChecks.includes(check)) continue;
    const runner = RUNNERS[check];
    if (!runner) continue;
    try {
      const rows = await runner(program.id, input.target);
      for (const f of rows) {
        saveFinding(f);
        collected.push(f);
      }
    } catch (e) {
      const f = findingBase(program.id, input.target, check, {
        title: `${CHECK_META[check].label} error`,
        summary: e instanceof Error ? e.message : "check failed",
        severity: "info" as BountySeverity,
        evidence: { error: String(e) },
        remediation: ["Retry check; review network path"],
      });
      saveFinding(f);
      collected.push(f);
    }
  }

  const op = demoOperator({
    engagementId: program.engagementId,
    legalBasis: program.legalBasis,
  });
  await appendAudit({
    operatorId: op.operatorId,
    action: "bounty.scan",
    allowed: true,
    risk: "medium",
    severity: "info",
    engagementId: program.engagementId,
    details: {
      programId: program.id,
      target: input.target,
      host: scope.host,
      findings: collected.length,
      checks,
    },
  });

  emitEvent({
    type: "osint.completed",
    source: "bounty.scan",
    severity: "info",
    title: `Bounty scan ${scope.host} · ${collected.length} findings`,
    payload: { programId: program.id, count: collected.length },
  });

  return { ok: true, findings: collected, host: scope.host };
}
