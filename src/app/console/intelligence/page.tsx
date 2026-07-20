"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/modules/i18n/context";

export default function IntelligencePage() {
  const { t } = useI18n();
  const [data, setData] = useState<{
    news: {
      id: string;
      source: string;
      title: string;
      url: string;
      summary?: string;
      score?: number;
      tags: string[];
      ts: string;
    }[];
    alerts: {
      id: string;
      severity: string;
      title: string;
      body: string;
      source: string;
      category: string;
    }[];
    sources: { id: string; status: string; detail: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/news");
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Intelligence
          </div>
          <h1 className="text-2xl font-semibold">{t("intel.title")}</h1>
        </div>
        <button className="lm-btn" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {data?.sources ? (
        <div className="flex flex-wrap gap-2">
          {data.sources.map((s) => (
            <span
              key={s.id}
              className={
                s.status === "ok" ? "lm-badge lm-badge-live" : "lm-badge lm-badge-crit"
              }
            >
              {s.id}: {s.detail}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/80">
            Global alerts
          </div>
          {(data?.alerts || []).map((a) => (
            <div key={a.id} className="lm-panel rounded-lg p-3">
              <span
                className={
                  a.severity === "critical"
                    ? "lm-badge lm-badge-crit"
                    : "lm-badge lm-badge-warn"
                }
              >
                {a.severity}
              </span>
              <div className="mt-1 text-sm font-medium">{a.title}</div>
              <div className="text-[11px] text-[var(--lm-muted)]">
                {a.source} · {a.category}
              </div>
            </div>
          ))}
          {!data?.alerts?.length ? (
            <div className="text-sm text-[var(--lm-muted)]">No elevated alerts</div>
          ) : null}
        </div>

        <div className="space-y-2 lg:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-cyan-300/80">
            News feed (Reddit · HN · USGS)
          </div>
          {(data?.news || []).map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="lm-panel block rounded-lg p-3 transition hover:border-cyan-400/40"
            >
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="lm-badge">{n.source}</span>
                {n.score != null ? (
                  <span className="lm-badge">score {n.score}</span>
                ) : null}
                {n.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="lm-badge">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-sm text-[var(--lm-text)]">{n.title}</div>
              {n.summary ? (
                <div className="mt-1 text-[11px] text-[var(--lm-muted)] line-clamp-2">
                  {n.summary}
                </div>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
