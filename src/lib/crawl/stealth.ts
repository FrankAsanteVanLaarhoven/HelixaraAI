/**
 * Stealth profile engine — enterprise-grade request hygiene.
 * Differentiator vs commodity scrapers:
 *  - Per-session fingerprint consistency
 *  - Timing jitter + human-like pacing
 *  - Proxy rotation hooks (residential / Tor SOCKS configurable)
 *  - Header canonicalization matching real browsers
 */

import { jitter } from "@/lib/utils";

export type StealthTier = "standard" | "elevated" | "sovereign";

export interface ProxyEndpoint {
  id: string;
  url: string; // http://user:pass@host:port or socks5://...
  kind: "datacenter" | "residential" | "tor" | "mobile";
  region?: string;
  health: "up" | "degraded" | "down";
}

export interface StealthSession {
  id: string;
  tier: StealthTier;
  userAgent: string;
  acceptLanguage: string;
  platform: string;
  viewport: { w: number; h: number };
  timezone: string;
  proxy?: ProxyEndpoint;
  createdAt: string;
  requestCount: number;
}

const UA_POOL = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
];

const LANG_POOL = ["en-US,en;q=0.9", "en-GB,en;q=0.9", "en-US,en;q=0.8,fr;q=0.6"];

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1512, h: 982 },
  { w: 1440, h: 900 },
  { w: 1366, h: 768 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** In-memory proxy registry — wire real endpoints via env HELIXARA_PROXIES */
export function loadProxyPool(): ProxyEndpoint[] {
  const raw = process.env.HELIXARA_PROXIES;
  if (!raw) {
    return [
      {
        id: "direct",
        url: "direct",
        kind: "datacenter",
        region: "local",
        health: "up",
      },
    ];
  }
  try {
    const parsed = JSON.parse(raw) as ProxyEndpoint[];
    return parsed.map((p, i) => ({
      ...p,
      id: p.id ?? `proxy_${i}`,
      health: p.health ?? "up",
    }));
  } catch {
    return [];
  }
}

export function createStealthSession(tier: StealthTier = "elevated"): StealthSession {
  const pool = loadProxyPool().filter((p) => p.health !== "down");
  let proxy: ProxyEndpoint | undefined;

  if (tier === "sovereign") {
    proxy =
      pool.find((p) => p.kind === "residential" || p.kind === "tor") ??
      pool.find((p) => p.url !== "direct") ??
      pool[0];
  } else if (tier === "elevated") {
    proxy = pool.find((p) => p.url !== "direct") ?? pool[0];
  } else {
    proxy = pool[0];
  }

  return {
    id: `stealth_${Date.now().toString(36)}`,
    tier,
    userAgent: pick(UA_POOL),
    acceptLanguage: pick(LANG_POOL),
    platform: pick(["MacIntel", "Win32", "Linux x86_64"]),
    viewport: pick(VIEWPORTS),
    timezone: pick(["UTC", "America/New_York", "Europe/London", "Europe/Amsterdam"]),
    proxy: proxy?.url === "direct" ? undefined : proxy,
    createdAt: new Date().toISOString(),
    requestCount: 0,
  };
}

export function buildRequestHeaders(session: StealthSession, url: string): HeadersInit {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "";
    }
  })();

  return {
    "User-Agent": session.userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": session.acceptLanguage,
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    ...(host ? { Host: host } : {}),
  };
}

export async function humanDelay(session: StealthSession, kind: "page" | "link" | "burst" = "page") {
  const base =
    kind === "burst" ? 120 : kind === "link" ? 450 : session.tier === "sovereign" ? 1200 : 700;
  const ms = jitter(base, session.tier === "sovereign" ? 0.5 : 0.3);
  await new Promise((r) => setTimeout(r, ms));
  session.requestCount += 1;
}

export function rotateProxy(session: StealthSession): StealthSession {
  const pool = loadProxyPool().filter((p) => p.health === "up" && p.url !== session.proxy?.url);
  if (!pool.length) return session;
  return { ...session, proxy: pool[Math.floor(Math.random() * pool.length)] };
}

export function stealthScore(session: StealthSession): {
  score: number;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 55;
  if (session.tier === "elevated") {
    score += 15;
    factors.push("elevated fingerprint consistency");
  }
  if (session.tier === "sovereign") {
    score += 25;
    factors.push("sovereign pacing + residential/tor preference");
  }
  if (session.proxy?.kind === "residential") {
    score += 12;
    factors.push("residential egress");
  }
  if (session.proxy?.kind === "tor") {
    score += 10;
    factors.push("tor-routed egress");
  }
  if (session.requestCount > 0 && session.requestCount < 40) {
    score += 5;
    factors.push("session request budget healthy");
  }
  return { score: Math.min(99, score), factors };
}
