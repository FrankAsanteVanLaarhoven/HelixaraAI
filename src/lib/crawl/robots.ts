/**
 * robots.txt respect layer — default-on for ethical surface scraping.
 */

import robotsParser from "robots-parser";

const cache = new Map<string, { parser: ReturnType<typeof robotsParser>; fetchedAt: number }>();
const TTL_MS = 15 * 60 * 1000;

export async function canFetchUrl(
  targetUrl: string,
  userAgent: string,
  opts: { force?: boolean } = {}
): Promise<{ allowed: boolean; robotsUrl: string; reason: string }> {
  let origin: string;
  try {
    const u = new URL(targetUrl);
    origin = u.origin;
  } catch {
    return { allowed: false, robotsUrl: "", reason: "invalid url" };
  }

  const robotsUrl = `${origin}/robots.txt`;
  const now = Date.now();
  let entry = cache.get(origin);

  if (!entry || now - entry.fetchedAt > TTL_MS || opts.force) {
    try {
      const res = await fetch(robotsUrl, {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(8000),
      });
      const body = res.ok ? await res.text() : "";
      entry = { parser: robotsParser(robotsUrl, body), fetchedAt: now };
      cache.set(origin, entry);
    } catch {
      // Fail-open with note if robots unreachable (common enterprise pattern with logging)
      return {
        allowed: true,
        robotsUrl,
        reason: "robots.txt unreachable — fail-open with audit note",
      };
    }
  }

  const allowed = entry.parser.isAllowed(targetUrl, userAgent) !== false;
  return {
    allowed,
    robotsUrl,
    reason: allowed ? "robots allows" : "robots disallows",
  };
}
