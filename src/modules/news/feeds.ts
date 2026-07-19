/**
 * News + Reddit + global public alerts (USGS earthquakes, GDACS-style RSS).
 */

import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";

export interface NewsItem {
  id: string;
  source: "reddit" | "usgs" | "gdacs" | "hn";
  title: string;
  url: string;
  summary?: string;
  score?: number;
  ts: string;
  tags: string[];
  region?: string;
}

export interface AlertItem {
  id: string;
  severity: "info" | "watch" | "warning" | "critical";
  title: string;
  body: string;
  lat?: number;
  lon?: number;
  source: string;
  ts: string;
  category: string;
}

async function fetchReddit(sub: string, limit = 15): Promise<NewsItem[]> {
  const res = await fetch(
    `https://www.reddit.com/r/${sub}/hot.json?limit=${limit}`,
    {
      headers: { "User-Agent": "HelixaraAI/0.1 (console; research)" },
      signal: AbortSignal.timeout(12_000),
    }
  );
  if (!res.ok) throw new Error(`Reddit r/${sub} HTTP ${res.status}`);
  const data = (await res.json()) as {
    data?: {
      children?: {
        data: {
          id: string;
          title: string;
          url: string;
          selftext?: string;
          score: number;
          created_utc: number;
          subreddit: string;
        };
      }[];
    };
  };
  return (data.data?.children || []).map((c) => ({
    id: `reddit-${c.data.id}`,
    source: "reddit" as const,
    title: c.data.title,
    url: c.data.url.startsWith("http")
      ? c.data.url
      : `https://reddit.com${c.data.url}`,
    summary: (c.data.selftext || "").slice(0, 280),
    score: c.data.score,
    ts: new Date(c.data.created_utc * 1000).toISOString(),
    tags: ["reddit", c.data.subreddit],
  }));
}

async function fetchUsgs(): Promise<{ news: NewsItem[]; alerts: AlertItem[] }> {
  const res = await fetch(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
    { signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
  const data = (await res.json()) as {
    features?: {
      id: string;
      properties: {
        mag: number;
        place: string;
        time: number;
        url: string;
        title: string;
      };
      geometry?: { coordinates?: number[] };
    }[];
  };
  const news: NewsItem[] = [];
  const alerts: AlertItem[] = [];
  for (const f of data.features || []) {
    const [lon, lat] = f.geometry?.coordinates || [];
    const ts = new Date(f.properties.time).toISOString();
    news.push({
      id: `usgs-${f.id}`,
      source: "usgs",
      title: f.properties.title,
      url: f.properties.url,
      summary: f.properties.place,
      ts,
      tags: ["earthquake", "usgs"],
      region: f.properties.place,
    });
    if (f.properties.mag >= 4.5) {
      alerts.push({
        id: uid("al"),
        severity: f.properties.mag >= 6 ? "critical" : f.properties.mag >= 5 ? "warning" : "watch",
        title: `M${f.properties.mag} · ${f.properties.place}`,
        body: f.properties.title,
        lat,
        lon,
        source: "usgs",
        ts,
        category: "seismic",
      });
    }
  }
  return { news, alerts };
}

async function fetchHn(): Promise<NewsItem[]> {
  const idsRes = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
    { signal: AbortSignal.timeout(8000) }
  );
  if (!idsRes.ok) throw new Error("HN ids failed");
  const ids = (await idsRes.json()) as number[];
  const items: NewsItem[] = [];
  for (const id of ids.slice(0, 12)) {
    try {
      const r = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) continue;
      const it = (await r.json()) as {
        title?: string;
        url?: string;
        score?: number;
        time?: number;
        text?: string;
      };
      if (!it.title) continue;
      items.push({
        id: `hn-${id}`,
        source: "hn",
        title: it.title,
        url: it.url || `https://news.ycombinator.com/item?id=${id}`,
        summary: (it.text || "").replace(/<[^>]+>/g, "").slice(0, 200),
        score: it.score,
        ts: new Date((it.time || 0) * 1000).toISOString(),
        tags: ["hackernews", "tech"],
      });
    } catch {
      /* skip */
    }
  }
  return items;
}

export async function getNewsAndAlerts(opts?: {
  subs?: string[];
}): Promise<{
  news: NewsItem[];
  alerts: AlertItem[];
  sources: { id: string; status: string; detail: string }[];
  fetchedAt: string;
}> {
  const subs = opts?.subs || ["netsec", "cybersecurity", "worldnews", "space"];
  const sources: { id: string; status: string; detail: string }[] = [];
  const news: NewsItem[] = [];
  const alerts: AlertItem[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const items = await fetchReddit(sub);
        news.push(...items);
        sources.push({ id: `reddit:${sub}`, status: "ok", detail: `${items.length} posts` });
      } catch (e) {
        sources.push({
          id: `reddit:${sub}`,
          status: "error",
          detail: e instanceof Error ? e.message : "failed",
        });
      }
    })
  );

  try {
    const u = await fetchUsgs();
    news.push(...u.news.slice(0, 30));
    alerts.push(...u.alerts);
    sources.push({
      id: "usgs",
      status: "ok",
      detail: `${u.news.length} quakes / ${u.alerts.length} alerts`,
    });
  } catch (e) {
    sources.push({
      id: "usgs",
      status: "error",
      detail: e instanceof Error ? e.message : "failed",
    });
  }

  try {
    const hn = await fetchHn();
    news.push(...hn);
    sources.push({ id: "hackernews", status: "ok", detail: `${hn.length} stories` });
  } catch (e) {
    sources.push({
      id: "hackernews",
      status: "error",
      detail: e instanceof Error ? e.message : "failed",
    });
  }

  news.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));

  emitEvent({
    type: "news.ingested",
    source: "news.feeds",
    severity: "info",
    title: `News fusion · ${news.length} items`,
    payload: { alerts: alerts.length },
  });

  for (const a of alerts.slice(0, 5)) {
    emitEvent({
      type: "alert.raised",
      source: a.source,
      severity: a.severity === "critical" ? "critical" : "warn",
      title: a.title,
      payload: { category: a.category, lat: a.lat, lon: a.lon },
      region: a.body,
    });
  }

  return {
    news: news.slice(0, 80),
    alerts: alerts.slice(0, 40),
    sources,
    fetchedAt: new Date().toISOString(),
  };
}
