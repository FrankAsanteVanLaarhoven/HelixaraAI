/**
 * Ethical OSINT collectors — public sources only.
 * Dark-web module is attestation-gated and simulated unless TOR + legal scope configured.
 */

import { AuthorizationContext, evaluateOsintQuery, hasScope } from "@/lib/ethics/guardrails";
import { appendAudit } from "@/lib/audit/logger";
import { uid } from "@/lib/utils";

export type OsintSource =
  | "dns"
  | "whois_hint"
  | "cert_transparency"
  | "http_headers"
  | "public_web"
  | "darkweb_index"; // gated

export interface OsintFinding {
  id: string;
  source: OsintSource;
  title: string;
  summary: string;
  confidence: number; // 0-1
  iocs: string[];
  tags: string[];
  raw?: Record<string, unknown>;
}

export interface OsintReport {
  queryId: string;
  query: string;
  status: "ok" | "blocked" | "partial";
  findings: OsintFinding[];
  darkWeb: {
    enabled: boolean;
    reason: string;
    placeholderHits: number;
  };
  durationMs: number;
}

function domainFromQuery(q: string): string | null {
  const cleaned = q.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) return cleaned;
  const m = q.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i);
  return m ? m[0].toLowerCase() : null;
}

async function collectDns(domain: string): Promise<OsintFinding[]> {
  const findings: OsintFinding[] = [];
  try {
    // DNS over HTTPS (public, ethical)
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        Answer?: { data: string; type: number }[];
      };
      const ips = (data.Answer || [])
        .filter((a) => a.type === 1)
        .map((a) => a.data);
      findings.push({
        id: uid("f"),
        source: "dns",
        title: `A records for ${domain}`,
        summary: ips.length
          ? `Resolved ${ips.length} IPv4 address(es)`
          : "No A records returned",
        confidence: ips.length ? 0.95 : 0.4,
        iocs: ips,
        tags: ["dns", "infrastructure"],
        raw: data as unknown as Record<string, unknown>,
      });
    }

    const mxRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (mxRes.ok) {
      const mx = (await mxRes.json()) as { Answer?: { data: string }[] };
      const mxs = (mx.Answer || []).map((a) => a.data);
      if (mxs.length) {
        findings.push({
          id: uid("f"),
          source: "dns",
          title: `MX records for ${domain}`,
          summary: `Mail infrastructure: ${mxs.slice(0, 3).join(", ")}`,
          confidence: 0.9,
          iocs: mxs,
          tags: ["dns", "email"],
          raw: mx as unknown as Record<string, unknown>,
        });
      }
    }
  } catch {
    findings.push({
      id: uid("f"),
      source: "dns",
      title: "DNS lookup failed",
      summary: "DoH endpoint timed out or rejected request",
      confidence: 0.2,
      iocs: [],
      tags: ["dns", "error"],
    });
  }
  return findings;
}

async function collectHeaders(domain: string): Promise<OsintFinding[]> {
  const findings: OsintFinding[] = [];
  for (const scheme of ["https", "http"]) {
    try {
      const res = await fetch(`${scheme}://${domain}/`, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "User-Agent":
            "HelixaraAI/0.1 (+authorized-osint; https://github.com/FrankAsanteVanLaarhoven/HelixaraAI)",
        },
      });
      const interesting = [
        "server",
        "x-powered-by",
        "strict-transport-security",
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "cf-ray",
        "via",
      ];
      const headers: Record<string, string> = {};
      for (const h of interesting) {
        const v = res.headers.get(h);
        if (v) headers[h] = v;
      }
      const missingSecurity = [
        "strict-transport-security",
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
      ].filter((h) => !res.headers.get(h));

      findings.push({
        id: uid("f"),
        source: "http_headers",
        title: `HTTP surface ${scheme}://${domain}`,
        summary: `Status ${res.status}. Security headers missing: ${
          missingSecurity.length ? missingSecurity.join(", ") : "none detected"
        }`,
        confidence: 0.85,
        iocs: [domain],
        tags: ["http", "hardening", ...Object.keys(headers)],
        raw: { status: res.status, headers, missingSecurity },
      });
      break;
    } catch {
      /* try next scheme */
    }
  }
  return findings;
}

async function collectCertTransparency(domain: string): Promise<OsintFinding[]> {
  // crt.sh public CT logs — ethical, widely used in OSINT
  try {
    const res = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
      { signal: AbortSignal.timeout(12_000) }
    );
    if (!res.ok) {
      return [
        {
          id: uid("f"),
          source: "cert_transparency",
          title: "Certificate Transparency",
          summary: `crt.sh returned HTTP ${res.status}`,
          confidence: 0.3,
          iocs: [],
          tags: ["ct", "error"],
        },
      ];
    }
    const rows = (await res.json()) as { name_value?: string; common_name?: string }[];
    const names = Array.from(
      new Set(
        rows
          .flatMap((r) =>
            `${r.name_value || ""}\n${r.common_name || ""}`.split("\n")
          )
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.includes(domain.replace(/^\*\./, "")))
      )
    ).slice(0, 40);

    return [
      {
        id: uid("f"),
        source: "cert_transparency",
        title: `CT names for ${domain}`,
        summary: `Discovered ${names.length} certificate name(s) via public CT logs`,
        confidence: names.length ? 0.88 : 0.45,
        iocs: names,
        tags: ["ct", "subdomains", "ssl"],
        raw: { sample: names.slice(0, 10) },
      },
    ];
  } catch {
    return [
      {
        id: uid("f"),
        source: "cert_transparency",
        title: "Certificate Transparency unavailable",
        summary: "crt.sh timeout or network restriction",
        confidence: 0.2,
        iocs: [],
        tags: ["ct", "error"],
      },
    ];
  }
}

function darkWebModule(ctx: AuthorizationContext, query: string) {
  const enabled =
    hasScope(ctx, "darkweb.authorized") &&
    Boolean(ctx.engagementId && ctx.legalBasis);

  if (!enabled) {
    return {
      enabled: false,
      reason:
        "Dark-web indexing requires darkweb.authorized scope + engagement attestation. Configure TOR SOCKS and legal ROE to activate.",
      placeholderHits: 0,
      findings: [] as OsintFinding[],
    };
  }

  // Even when authorized, we do not ship live dark-market scrapers.
  // Integration point: plug Tor SOCKS + authorized indexer here.
  const findings: OsintFinding[] = [
    {
      id: uid("f"),
      source: "darkweb_index",
      title: "Authorized dark-web channel (stub)",
      summary: `Legal channel ready for query "${query.slice(0, 80)}". Live .onion collectors are disabled in this build — wire HELIXARA_TOR_SOCKS + approved indexers.`,
      confidence: 0.35,
      iocs: [],
      tags: ["darkweb", "authorized", "stub"],
      raw: {
        torSocks: process.env.HELIXARA_TOR_SOCKS || null,
        note: "Ethical design: no marketplace automation shipped by default",
      },
    },
  ];

  return {
    enabled: true,
    reason: "Authorized channel present; live collectors optional via env",
    placeholderHits: findings.length,
    findings,
  };
}

export async function runOsint(
  query: string,
  ctx: AuthorizationContext
): Promise<OsintReport> {
  const started = Date.now();
  const queryId = uid("osint");
  const decision = evaluateOsintQuery(query, ctx);

  await appendAudit({
    operatorId: ctx.operatorId,
    action: "osint.query",
    resource: query.slice(0, 200),
    allowed: decision.allowed,
    risk: decision.risk,
    severity: decision.allowed ? "info" : "warn",
    engagementId: ctx.engagementId,
    details: { queryId, reasons: decision.reasons },
  });

  if (!decision.allowed) {
    return {
      queryId,
      query,
      status: "blocked",
      findings: [],
      darkWeb: {
        enabled: false,
        reason: decision.reasons.join("; "),
        placeholderHits: 0,
      },
      durationMs: Date.now() - started,
    };
  }

  const domain = domainFromQuery(query);
  const findings: OsintFinding[] = [];

  if (domain) {
    const [dns, headers, ct] = await Promise.all([
      collectDns(domain),
      collectHeaders(domain),
      collectCertTransparency(domain),
    ]);
    findings.push(...dns, ...headers, ...ct);

    findings.push({
      id: uid("f"),
      source: "whois_hint",
      title: "WHOIS / registration (hint)",
      summary: `Use RDAP/WHOIS for ${domain} under your jurisdictional policy. HelixaraAI stores operator notes only — no bulk privacy-invasive harvesting.`,
      confidence: 0.5,
      iocs: [domain],
      tags: ["whois", "policy"],
    });
  } else {
    findings.push({
      id: uid("f"),
      source: "public_web",
      title: "Entity / keyword OSINT",
      summary: `Non-domain query accepted. Pivot to domain, email pattern, or ASN for infrastructure enrichment. Query: ${query.slice(0, 120)}`,
      confidence: 0.4,
      iocs: [],
      tags: ["entity", "keyword"],
    });
  }

  const dw = darkWebModule(ctx, query);
  findings.push(...dw.findings);

  await appendAudit({
    operatorId: ctx.operatorId,
    action: "osint.complete",
    resource: query.slice(0, 200),
    allowed: true,
    risk: "low",
    severity: "info",
    engagementId: ctx.engagementId,
    details: {
      queryId,
      findingCount: findings.length,
      darkWebEnabled: dw.enabled,
    },
  });

  return {
    queryId,
    query,
    status: "ok",
    findings,
    darkWeb: {
      enabled: dw.enabled,
      reason: dw.reason,
      placeholderHits: dw.placeholderHits,
    },
    durationMs: Date.now() - started,
  };
}
