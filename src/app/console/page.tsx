"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/console/MetricCard";
import { GlobeCanvas } from "@/components/console/GlobeCanvas";
import {
  ArrowRight,
  Bot,
  CloudSun,
  Cpu,
  Eye,
  FileSearch,
  Newspaper,
  ScrollText,
  Zap,
} from "lucide-react";
import { useI18n } from "@/modules/i18n/context";

type GeoSnap = {
  layers: {
    points: { id: string; lat: number; lon: number; label: string; kind: string }[];
  }[];
  entityCount?: number;
  generatedAt: string;
};

export default function ConsoleHome() {
  const { t } = useI18n();
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [geo, setGeo] = useState<GeoSnap | null>(null);
  const [auditCount, setAuditCount] = useState(0);
  const [missions, setMissions] = useState(0);
  const [events, setEvents] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/health").then((r) => r.json()),
      fetch("/api/v1/geospatial").then((r) => r.json()),
      fetch("/api/v1/audit?limit=50").then((r) => r.json()),
      fetch("/api/v1/hermes").then((r) => r.json()),
      fetch("/api/v1/events?limit=5").then((r) => r.json()),
    ]).then(([h, g, a, m, e]) => {
      setHealth(h);
      setGeo(g);
      setAuditCount(a.count || a.events?.length || 0);
      setMissions(m.runs?.length || 0);
      setEvents(e.stats?.total || e.events?.length || 0);
    });
  }, []);

  const points = geo?.layers.flatMap((l) => l.points) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Mission Control
          </div>
          <h1 className="text-2xl font-semibold text-[var(--lm-text)]">
            {t("console.title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--lm-muted)]">{t("console.subtitle")}</p>
        </div>
        <div className="lm-badge lm-badge-live">
          {health ? t("status.online") : t("common.loading")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label={t("console.metrics.service")}
          value="HelixaraAI"
          hint="v0.2 · :3007"
          tone="cyan"
        />
        <MetricCard
          label={t("console.metrics.missions")}
          value={missions}
          hint="Hermes runs"
          tone="amber"
        />
        <MetricCard
          label={t("console.metrics.audit")}
          value={auditCount}
          hint="chain of custody"
          tone="green"
        />
        <MetricCard
          label={t("console.metrics.layers")}
          value={geo?.entityCount ?? points.length}
          hint="live fusion"
          tone="cyan"
        />
        <MetricCard label="Events" value={events} hint="bus buffer" tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lm-panel relative h-[380px] overflow-hidden rounded-lg lg:col-span-3">
          <GlobeCanvas points={points} mode="standard" />
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--lm-muted)]">
              {t("console.quick")}
            </div>
            <div className="space-y-2">
              {[
                {
                  href: "/console/scrape",
                  icon: Eye,
                  title: t("nav.scrape"),
                  desc: t("home.card.scrape.desc"),
                },
                {
                  href: "/console/missions",
                  icon: Bot,
                  title: t("nav.agents"),
                  desc: t("home.card.agents.desc"),
                },
                {
                  href: "/console/events",
                  icon: Zap,
                  title: t("nav.events"),
                  desc: t("events.desc"),
                },
                {
                  href: "/console/intelligence",
                  icon: Newspaper,
                  title: t("nav.intelligence"),
                  desc: t("intel.desc"),
                },
                {
                  href: "/console/weather",
                  icon: CloudSun,
                  title: t("nav.weather"),
                  desc: t("weather.desc"),
                },
                {
                  href: "/console/quantum",
                  icon: Cpu,
                  title: t("nav.quantum"),
                  desc: t("quantum.desc"),
                },
                {
                  href: "/console/osint",
                  icon: FileSearch,
                  title: t("nav.osint"),
                  desc: t("home.card.osint.desc"),
                },
                {
                  href: "/console/audit",
                  icon: ScrollText,
                  title: t("nav.audit"),
                  desc: t("audit.desc"),
                },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded border border-transparent px-2 py-2 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                >
                  <a.icon className="h-4 w-4 shrink-0 text-cyan-300" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[var(--lm-text)]">{a.title}</div>
                    <div className="truncate text-[11px] text-[var(--lm-muted)]">
                      {a.desc}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--lm-muted)]" />
                </Link>
              ))}
            </div>
          </div>

          <div className="lm-panel rounded-lg p-4 text-sm text-[var(--lm-muted)]">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
              SOTA modular stack
            </div>
            {t("console.market")}
          </div>
        </div>
      </div>
    </div>
  );
}
