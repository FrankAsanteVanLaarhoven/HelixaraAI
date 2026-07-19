"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/modules/i18n/context";

type Ev = {
  id: string;
  type: string;
  ts: string;
  source: string;
  severity: string;
  title: string;
  payload?: Record<string, unknown>;
};

export default function EventsPage() {
  const { t } = useI18n();
  const [events, setEvents] = useState<Ev[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  async function load() {
    const res = await fetch("/api/v1/events?limit=100");
    const data = await res.json();
    setEvents(data.events || []);
    setStats(data.stats || null);
  }

  useEffect(() => {
    load();
    const es = new EventSource("/api/v1/events/stream");
    es.onmessage = (msg) => {
      try {
        const e = JSON.parse(msg.data) as Ev;
        if (!e?.id) return;
        setEvents((prev) => {
          if (prev.some((x) => x.id === e.id)) return prev;
          return [e, ...prev].slice(0, 120);
        });
      } catch {
        /* ping */
      }
    };
    const poll = setInterval(load, 20000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Module · Events
          </div>
          <h1 className="text-2xl font-semibold">{t("events.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
            {t("events.desc")}
          </p>
        </div>
        <button className="lm-btn" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          {t("common.refresh")}
        </button>
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">Buffered</div>
            <div className="text-xl text-cyan-300">{String(stats.total)}</div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">Listeners</div>
            <div className="text-xl text-cyan-300">{String(stats.listeners)}</div>
          </div>
          <div className="lm-panel rounded-lg p-3 text-sm">
            <div className="text-[10px] uppercase text-[var(--lm-muted)]">Latest</div>
            <div className="truncate text-sm text-cyan-100/80">
              {String(stats.latest || "—")}
            </div>
          </div>
        </div>
      ) : null}

      <div className="lm-panel max-h-[65vh] space-y-2 overflow-auto rounded-lg p-3">
        {events.map((e) => (
          <div
            key={e.id}
            className="rounded border border-[var(--lm-border)] bg-black/20 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="lm-badge">{e.severity}</span>
              <span className="font-mono text-cyan-300/80">{e.type}</span>
              <span className="text-[var(--lm-muted)]">{e.source}</span>
              <span className="ms-auto font-mono text-[var(--lm-muted)]">
                {new Date(e.ts).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 text-sm text-[var(--lm-text)]">{e.title}</div>
          </div>
        ))}
        {!events.length ? (
          <div className="p-6 text-center text-sm text-[var(--lm-muted)]">
            {t("common.loading")} — trigger scrape / OSINT / Hermes to emit events
          </div>
        ) : null}
      </div>
    </div>
  );
}
