"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";

type ScrapeResult = {
  jobId: string;
  status: string;
  durationMs: number;
  error?: string;
  stealth?: { score: number; factors: string[]; tier: string; sessionId: string };
  robots?: { allowed: boolean; reason: string };
  page?: {
    title: string;
    description: string;
    markdown: string;
    structured: {
      emails: string[];
      phones: string[];
      socials: string[];
      technologies: string[];
    };
    stats: { wordCount: number; linkCount: number; htmlBytes: number };
    links: { href: string; text: string }[];
  };
  crawlMap?: { url: string; status: number | string; title?: string }[];
  decision?: { risk: string; reasons: string[] };
};

export default function ScrapePage() {
  const [url, setUrl] = useState("https://example.com");
  const [deep, setDeep] = useState(false);
  const [tier, setTier] = useState<"standard" | "elevated" | "sovereign">("elevated");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, deep, tier, respectRobots: true }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({
        jobId: "local",
        status: "error",
        durationMs: 0,
        error: e instanceof Error ? e.message : "failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Module · Stealth Crawl
        </div>
        <h1 className="text-2xl font-semibold">Cyberscrape Engine</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
          Enterprise self-hosted crawl with stealth sessions, robots respect,
          structured extraction, and full audit — designed to beat SaaS scrapers
          on sovereignty, evasion hygiene, and compliance.
        </p>
      </div>

      <div className="lm-panel space-y-3 rounded-lg p-4">
        <label className="block text-[11px] uppercase tracking-wider text-[var(--lm-muted)]">
          Target URL
        </label>
        <input
          className="lm-input font-mono"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://target.example"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--lm-muted)]">
            <input
              type="checkbox"
              checked={deep}
              onChange={(e) => setDeep(e.target.checked)}
            />
            Deep same-origin crawl
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--lm-muted)]">
            Stealth tier
            <select
              className="lm-input w-auto"
              value={tier}
              onChange={(e) =>
                setTier(e.target.value as "standard" | "elevated" | "sovereign")
              }
            >
              <option value="standard">standard</option>
              <option value="elevated">elevated</option>
              <option value="sovereign">sovereign</option>
            </select>
          </label>
          <button className="lm-btn" onClick={run} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            {loading ? "Crawling…" : "Execute scrape"}
          </button>
        </div>
      </div>

      {result ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lm-panel space-y-3 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  result.status === "ok"
                    ? "lm-badge lm-badge-live"
                    : result.status === "blocked"
                      ? "lm-badge lm-badge-warn"
                      : "lm-badge lm-badge-crit"
                }
              >
                {result.status}
              </span>
              <span className="text-xs text-[var(--lm-muted)]">
                {result.jobId} · {result.durationMs}ms
              </span>
              {result.stealth ? (
                <span className="lm-badge">
                  stealth {result.stealth.score}/99 · {result.stealth.tier}
                </span>
              ) : null}
            </div>
            {result.error ? (
              <p className="text-sm text-rose-300">{result.error}</p>
            ) : null}
            {result.page ? (
              <>
                <h2 className="text-lg font-medium text-cyan-200">
                  {result.page.title || "(no title)"}
                </h2>
                <p className="text-sm text-[var(--lm-muted)]">
                  {result.page.description}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded border border-[var(--lm-border)] p-2">
                    <div className="text-cyan-300">{result.page.stats.wordCount}</div>
                    words
                  </div>
                  <div className="rounded border border-[var(--lm-border)] p-2">
                    <div className="text-cyan-300">{result.page.stats.linkCount}</div>
                    links
                  </div>
                  <div className="rounded border border-[var(--lm-border)] p-2">
                    <div className="text-cyan-300">
                      {Math.round(result.page.stats.htmlBytes / 1024)}k
                    </div>
                    html
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
                    Technologies
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.page.structured.technologies.length ? (
                      result.page.structured.technologies.map((t) => (
                        <span key={t} className="lm-badge">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--lm-muted)]">none detected</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
                    Emails / socials
                  </div>
                  <ul className="mt-1 max-h-28 overflow-auto font-mono text-xs text-[var(--lm-muted)]">
                    {result.page.structured.emails.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                    {result.page.structured.socials.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                    {!result.page.structured.emails.length &&
                    !result.page.structured.socials.length ? (
                      <li>none</li>
                    ) : null}
                  </ul>
                </div>
              </>
            ) : null}
            {result.stealth?.factors?.length ? (
              <div className="text-xs text-[var(--lm-muted)]">
                Factors: {result.stealth.factors.join(" · ")}
              </div>
            ) : null}
          </div>

          <div className="lm-panel rounded-lg p-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
              Markdown extract (LLM-ready)
            </div>
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-[var(--lm-muted)]">
              {result.page?.markdown?.slice(0, 8000) ||
                result.error ||
                "No content"}
            </pre>
            {result.crawlMap?.length ? (
              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--lm-muted)]">
                  Crawl map
                </div>
                <ul className="max-h-32 space-y-1 overflow-auto font-mono text-[11px] text-[var(--lm-muted)]">
                  {result.crawlMap.map((c) => (
                    <li key={c.url}>
                      [{c.status}] {c.title || c.url}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
