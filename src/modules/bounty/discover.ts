/**
 * Dynamic site discovery under program in-scope roots.
 * Expands seeds → subdomains / related hosts (public sources only).
 * Still ROE-bound — never unrestricted internet-wide scanning.
 */

import { uid } from "@/lib/utils";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";
import { emitEvent } from "@/modules/events/bus";
import { getProgram, setProgramAssets, listProgramAssets } from "@/modules/bounty/store";
import { hostFromTarget, isInScope } from "@/modules/bounty/scope";
import type { DynamicAsset } from "@/modules/bounty/types";

const COMMON_PREFIXES = [
  "www",
  "api",
  "app",
  "admin",
  "portal",
  "login",
  "mail",
  "webmail",
  "cdn",
  "static",
  "assets",
  "dev",
  "staging",
  "stage",
  "test",
  "qa",
  "uat",
  "beta",
  "m",
  "mobile",
  "shop",
  "store",
  "blog",
  "docs",
  "status",
  "vpn",
  "git",
  "gitlab",
  "ci",
  "grafana",
  "monitor",
  "auth",
  "sso",
  "id",
  "secure",
  "pay",
  "payments",
];

function apexFromPattern(pattern: string): string | null {
  const p = pattern.toLowerCase().trim();
  if (!p) return null;
  if (p.startsWith("*.")) return p.slice(2);
  // bare domain
  if (p.includes("/") || p.includes(":")) {
    try {
      return hostFromTarget(p);
    } catch {
      return null;
    }
  }
  return p.replace(/^\*\./, "");
}

function rootsFromProgram(inScope: string[]): string[] {
  const roots = new Set<string>();
  for (const s of inScope) {
    const apex = apexFromPattern(s);
    if (apex && apex.includes(".")) roots.add(apex);
  }
  return [...roots];
}

async function dohHasA(host: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { Answer?: { type: number }[] };
    return Boolean((data.Answer || []).some((a) => a.type === 1));
  } catch {
    return false;
  }
}

async function crtShHosts(apex: string, limit = 80): Promise<string[]> {
  try {
    const url = `https://crt.sh/?q=${encodeURIComponent(`%.${apex}`)}&output=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "HelixaraAI-Bounty/0.2 (+authorized CT discovery)" },
      signal: AbortSignal.timeout(18_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { name_value?: string }[];
    const hosts = new Set<string>();
    for (const row of data.slice(0, 500)) {
      const nv = row.name_value || "";
      for (const part of nv.split(/\n/)) {
        const h = part.trim().toLowerCase().replace(/^\*\./, "");
        if (h.endsWith(`.${apex}`) || h === apex) hosts.add(h);
      }
      if (hosts.size >= limit) break;
    }
    return [...hosts].slice(0, limit);
  } catch {
    return [];
  }
}

async function probeLive(host: string): Promise<{
  live: boolean;
  url?: string;
  status?: number;
  title?: string;
}> {
  for (const scheme of ["https", "http"] as const) {
    try {
      const url = `${scheme}://${host}`;
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "HelixaraAI-Bounty/0.2 (+authorized surface probe)",
        },
      });
      let title: string | undefined;
      try {
        const html = (await res.text()).slice(0, 8000);
        const m = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
        title = m?.[1]?.trim();
      } catch {
        /* ignore body */
      }
      return { live: true, url, status: res.status, title };
    } catch {
      /* try next scheme */
    }
  }
  return { live: false };
}

async function discoverFromSitemap(seedUrl: string): Promise<string[]> {
  const hosts = new Set<string>();
  try {
    const base = seedUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/sitemap.xml`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "HelixaraAI-Bounty/0.2" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    const locs = text.match(/<loc>([^<]+)<\/loc>/gi) || [];
    for (const loc of locs.slice(0, 100)) {
      const raw = loc.replace(/<\/?loc>/gi, "").trim();
      try {
        hosts.add(new URL(raw).hostname.toLowerCase());
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return [...hosts];
}

export async function discoverProgramSites(input: {
  programId: string;
  /** Max hosts to keep after filter */
  maxHosts?: number;
  probeLive?: boolean;
}): Promise<{
  ok: boolean;
  reason?: string;
  assets: DynamicAsset[];
  stats: {
    roots: number;
    crt: number;
    prefix: number;
    sitemap: number;
    live: number;
    total: number;
  };
}> {
  const program = getProgram(input.programId);
  if (!program) return { ok: false, reason: "program not found", assets: [], stats: emptyStats() };
  if (!program.active) {
    return { ok: false, reason: "program inactive", assets: [], stats: emptyStats() };
  }

  const maxHosts = Math.min(Math.max(input.maxHosts ?? 60, 5), 120);
  const probe = input.probeLive !== false;
  const roots = rootsFromProgram(program.inScope);
  if (!roots.length) {
    return {
      ok: false,
      reason: "No domain roots in inScope — add domains or *.domain.tld",
      assets: [],
      stats: emptyStats(),
    };
  }

  type AssetSource = DynamicAsset["sources"][number];
  const candidates = new Map<string, AssetSource[]>();
  const add = (host: string, source: AssetSource) => {
    const h = host.toLowerCase().replace(/\.$/, "");
    if (!h || h.length < 3) return;
    const prev = candidates.get(h) || [];
    if (!prev.includes(source)) prev.push(source);
    candidates.set(h, prev);
  };

  // Seeds from explicit scope entries
  for (const s of program.inScope) {
    if (s.startsWith("*.")) {
      add(s.slice(2), "seed");
    } else {
      add(hostFromTarget(s), "seed");
    }
  }

  let crtCount = 0;
  let prefixCount = 0;
  let sitemapCount = 0;

  // Certificate Transparency
  for (const apex of roots) {
    const crt = await crtShHosts(apex, 60);
    crtCount += crt.length;
    for (const h of crt) add(h, "crt");
  }

  // Common prefixes under each apex (DNS resolve check)
  for (const apex of roots) {
    for (const pre of COMMON_PREFIXES) {
      const host = `${pre}.${apex}`;
      const ok = await dohHasA(host);
      if (ok) {
        prefixCount++;
        add(host, "prefix");
      }
    }
  }

  // Sitemap hosts from seed roots
  for (const apex of roots) {
    const fromMap = await discoverFromSitemap(`https://${apex}`);
    sitemapCount += fromMap.length;
    for (const h of fromMap) add(h, "sitemap");
  }

  // Scope filter + build assets
  const assets: DynamicAsset[] = [];
  let liveCount = 0;
  const sorted = [...candidates.keys()].sort();

  for (const host of sorted) {
    if (assets.length >= maxHosts) break;
    const scope = isInScope(program, host);
    if (!scope.ok) continue;

    let live = false;
    let url: string | undefined;
    let status: number | undefined;
    let title: string | undefined;
    if (probe) {
      const p = await probeLive(host);
      live = p.live;
      url = p.url;
      status = p.status;
      title = p.title;
      if (live) liveCount++;
    }

    const sources = candidates.get(host) || ["seed"];
    assets.push({
      id: uid("bast"),
      programId: program.id,
      host,
      url: url || `https://${host}`,
      sources,
      live: probe ? live : undefined,
      httpStatus: status,
      title,
      discoveredAt: new Date().toISOString(),
      lastScannedAt: undefined,
    });
  }

  // Always ensure seed hosts present even if probe failed
  for (const s of program.inScope) {
    const host = s.startsWith("*.") ? s.slice(2) : hostFromTarget(s);
    if (assets.some((a) => a.host === host)) continue;
    if (!isInScope(program, host).ok) continue;
    if (assets.length >= maxHosts) break;
    assets.unshift({
      id: uid("bast"),
      programId: program.id,
      host,
      url: `https://${host}`,
      sources: ["seed"],
      live: undefined,
      discoveredAt: new Date().toISOString(),
    });
  }

  setProgramAssets(program.id, assets);

  const stats = {
    roots: roots.length,
    crt: crtCount,
    prefix: prefixCount,
    sitemap: sitemapCount,
    live: liveCount,
    total: assets.length,
  };

  await appendAudit({
    operatorId: demoOperator().operatorId,
    action: "bounty.discover",
    allowed: true,
    risk: "medium",
    severity: "info",
    engagementId: program.engagementId,
    details: { programId: program.id, ...stats },
  });

  emitEvent({
    type: "osint.completed",
    source: "bounty.discover",
    severity: "info",
    title: `Dynamic discovery · ${assets.length} sites`,
    payload: { programId: program.id, ...stats },
  });

  return { ok: true, assets: listProgramAssets(program.id), stats };
}

function emptyStats() {
  return { roots: 0, crt: 0, prefix: 0, sitemap: 0, live: 0, total: 0 };
}

export async function runDynamicScanAll(input: {
  programId: string;
  /** Discover first if inventory empty or force */
  rediscover?: boolean;
  onlyLive?: boolean;
  maxSites?: number;
  checks?: string[];
}): Promise<{
  ok: boolean;
  reason?: string;
  scanned: string[];
  skipped: string[];
  findingCount: number;
  assets: DynamicAsset[];
  errors: { host: string; reason: string }[];
}> {
  const program = getProgram(input.programId);
  if (!program) {
    return {
      ok: false,
      reason: "program not found",
      scanned: [],
      skipped: [],
      findingCount: 0,
      assets: [],
      errors: [],
    };
  }

  let assets = listProgramAssets(program.id);
  if (!assets.length || input.rediscover) {
    const d = await discoverProgramSites({
      programId: program.id,
      maxHosts: input.maxSites ?? 60,
      probeLive: true,
    });
    if (!d.ok) {
      return {
        ok: false,
        reason: d.reason,
        scanned: [],
        skipped: [],
        findingCount: 0,
        assets: [],
        errors: [],
      };
    }
    assets = d.assets;
  }

  const { runBountyScan } = await import("@/modules/bounty/scan");
  const maxSites = Math.min(Math.max(input.maxSites ?? 40, 1), 80);
  const scanned: string[] = [];
  const skipped: string[] = [];
  const errors: { host: string; reason: string }[] = [];
  let findingCount = 0;

  const targets = assets
    .filter((a) => (input.onlyLive ? a.live !== false : true))
    .slice(0, maxSites);

  for (const asset of targets) {
    const scope = isInScope(program, asset.host);
    if (!scope.ok) {
      skipped.push(asset.host);
      continue;
    }
    try {
      const result = await runBountyScan({
        programId: program.id,
        target: asset.url || asset.host,
        checks: input.checks as never,
      });
      if (!result.ok) {
        errors.push({ host: asset.host, reason: result.reason || "scan failed" });
        continue;
      }
      scanned.push(asset.host);
      findingCount += result.findings.length;
      asset.lastScannedAt = new Date().toISOString();
    } catch (e) {
      errors.push({
        host: asset.host,
        reason: e instanceof Error ? e.message : "error",
      });
    }
  }

  setProgramAssets(program.id, assets);

  await appendAudit({
    operatorId: demoOperator().operatorId,
    action: "bounty.scan.all",
    allowed: true,
    risk: "medium",
    severity: "info",
    engagementId: program.engagementId,
    details: {
      programId: program.id,
      scanned: scanned.length,
      findingCount,
      errors: errors.length,
    },
  });

  return {
    ok: true,
    scanned,
    skipped,
    findingCount,
    assets: listProgramAssets(program.id),
    errors,
  };
}
