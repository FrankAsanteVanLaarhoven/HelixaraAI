/**
 * HelixaraAI Stealth Crawl Engine
 * Self-hosted, authorization-gated, audit-first alternative to SaaS scrapers.
 */

import {
  AuthorizationContext,
  evaluateScrapeTarget,
} from "@/lib/ethics/guardrails";
import { appendAudit } from "@/lib/audit/logger";
import {
  StealthTier,
  buildRequestHeaders,
  createStealthSession,
  humanDelay,
  stealthScore,
} from "@/lib/crawl/stealth";
import { canFetchUrl } from "@/lib/crawl/robots";
import { ExtractedPage, extractPage } from "@/lib/crawl/extract";
import { uid } from "@/lib/utils";
import { emitEvent } from "@/modules/events/bus";

export interface ScrapeRequest {
  url: string;
  tier?: StealthTier;
  deep?: boolean;
  respectRobots?: boolean;
  maxLinks?: number;
  timeoutMs?: number;
}

export interface ScrapeResult {
  jobId: string;
  status: "ok" | "blocked" | "error";
  decision: ReturnType<typeof evaluateScrapeTarget>;
  stealth?: ReturnType<typeof stealthScore> & { sessionId: string; tier: StealthTier };
  robots?: { allowed: boolean; robotsUrl: string; reason: string };
  page?: ExtractedPage;
  crawlMap?: { url: string; status: number | "skipped"; title?: string }[];
  error?: string;
  durationMs: number;
}

export async function scrapeUrl(
  req: ScrapeRequest,
  ctx: AuthorizationContext
): Promise<ScrapeResult> {
  const started = Date.now();
  const jobId = uid("job");
  const deep = Boolean(req.deep);
  const respectRobots = req.respectRobots !== false;
  const tier = req.tier ?? (deep ? "sovereign" : "elevated");

  const decision = evaluateScrapeTarget(req.url, ctx, { deep, respectRobots });

  await appendAudit({
    operatorId: ctx.operatorId,
    action: deep ? "crawl.deep" : "scrape.surface",
    resource: req.url,
    risk: decision.risk,
    allowed: decision.allowed,
    engagementId: ctx.engagementId,
    severity: decision.allowed ? "info" : "warn",
    details: { jobId, tier, reasons: decision.reasons },
  });

  emitEvent({
    type: decision.allowed ? "scrape.started" : "scrape.blocked",
    source: "crawl.engine",
    severity: decision.allowed ? "info" : "warn",
    title: decision.allowed
      ? `Stealth scrape started · ${req.url}`
      : `Scrape blocked · ${req.url}`,
    payload: { jobId, tier, deep, risk: decision.risk },
  });

  if (!decision.allowed) {
    return {
      jobId,
      status: "blocked",
      decision,
      durationMs: Date.now() - started,
      error: decision.reasons.join("; "),
    };
  }

  const session = createStealthSession(tier);

  try {
    let robotsMeta: ScrapeResult["robots"];
    if (respectRobots) {
      robotsMeta = await canFetchUrl(req.url, session.userAgent);
      if (!robotsMeta.allowed) {
        await appendAudit({
          operatorId: ctx.operatorId,
          action: "scrape.robots_block",
          resource: req.url,
          allowed: false,
          risk: "medium",
          severity: "warn",
          engagementId: ctx.engagementId,
          details: robotsMeta,
        });
        return {
          jobId,
          status: "blocked",
          decision,
          robots: robotsMeta,
          stealth: { ...stealthScore(session), sessionId: session.id, tier },
          durationMs: Date.now() - started,
          error: `robots.txt disallow: ${robotsMeta.reason}`,
        };
      }
    }

    await humanDelay(session, "page");

    const headers = buildRequestHeaders(session, req.url);
    const res = await fetch(req.url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(req.timeoutMs ?? 20_000),
    });

    if (!res.ok) {
      return {
        jobId,
        status: "error",
        decision,
        robots: robotsMeta,
        stealth: { ...stealthScore(session), sessionId: session.id, tier },
        durationMs: Date.now() - started,
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    const html = await res.text();

    if (!/html|text|xml/i.test(contentType) && !html.slice(0, 200).includes("<")) {
      return {
        jobId,
        status: "error",
        decision,
        robots: robotsMeta,
        stealth: { ...stealthScore(session), sessionId: session.id, tier },
        durationMs: Date.now() - started,
        error: `Unsupported content-type: ${contentType || "unknown"}`,
      };
    }

    const page = extractPage(req.url, html);
    const crawlMap: ScrapeResult["crawlMap"] = [
      { url: req.url, status: res.status, title: page.title },
    ];

    // Optional shallow link expansion (same-origin only)
    if (deep) {
      const origin = new URL(req.url).origin;
      const sameOrigin = page.links
        .filter((l) => l.href.startsWith(origin))
        .slice(0, req.maxLinks ?? 5);

      for (const link of sameOrigin) {
        const childDecision = evaluateScrapeTarget(link.href, ctx, {
          deep: true,
          respectRobots,
        });
        if (!childDecision.allowed) {
          crawlMap.push({ url: link.href, status: "skipped", title: "guardrail" });
          continue;
        }
        if (respectRobots) {
          const r = await canFetchUrl(link.href, session.userAgent);
          if (!r.allowed) {
            crawlMap.push({ url: link.href, status: "skipped", title: "robots" });
            continue;
          }
        }
        await humanDelay(session, "link");
        try {
          const childRes = await fetch(link.href, {
            headers: buildRequestHeaders(session, link.href),
            redirect: "follow",
            signal: AbortSignal.timeout(12_000),
          });
          if (!childRes.ok) {
            crawlMap.push({ url: link.href, status: childRes.status });
            continue;
          }
          const childHtml = await childRes.text();
          const childPage = extractPage(link.href, childHtml);
          crawlMap.push({
            url: link.href,
            status: childRes.status,
            title: childPage.title,
          });
          // merge lightweight signals
          page.structured.emails = Array.from(
            new Set([...page.structured.emails, ...childPage.structured.emails])
          ).slice(0, 50);
          page.structured.technologies = Array.from(
            new Set([
              ...page.structured.technologies,
              ...childPage.structured.technologies,
            ])
          );
        } catch {
          crawlMap.push({ url: link.href, status: "skipped", title: "fetch_error" });
        }
      }
    }

    const score = stealthScore(session);
    await appendAudit({
      operatorId: ctx.operatorId,
      action: "scrape.success",
      resource: req.url,
      allowed: true,
      risk: decision.risk,
      severity: "info",
      engagementId: ctx.engagementId,
      details: {
        jobId,
        title: page.title,
        words: page.stats.wordCount,
        links: page.stats.linkCount,
        tier,
        stealth: score.score,
      },
    });

    emitEvent({
      type: "scrape.completed",
      source: "crawl.engine",
      severity: "info",
      title: `Stealth scrape OK · ${page.title || req.url}`,
      payload: {
        jobId,
        words: page.stats.wordCount,
        stealth: score.score,
        tier,
      },
    });
    emitEvent({
      type: "crawl.stealth",
      source: "crawl.stealth",
      severity: "info",
      title: `Stealth score ${score.score}/99`,
      payload: { factors: score.factors, sessionId: session.id },
    });

    return {
      jobId,
      status: "ok",
      decision,
      robots: robotsMeta,
      stealth: { ...stealthScore(session), sessionId: session.id, tier },
      page,
      crawlMap,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await appendAudit({
      operatorId: ctx.operatorId,
      action: "scrape.error",
      resource: req.url,
      allowed: true,
      risk: "medium",
      severity: "warn",
      engagementId: ctx.engagementId,
      details: { jobId, error: message },
    });
    return {
      jobId,
      status: "error",
      decision,
      stealth: { ...stealthScore(session), sessionId: session.id, tier },
      durationMs: Date.now() - started,
      error: message,
    };
  }
}
