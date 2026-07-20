"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/console/MetricCard";
import { GlobeCanvas } from "@/components/console/GlobeCanvas";
import {
  ArrowRight,
  Bot,
  Brain,
  CloudSun,
  Cpu,
  Eye,
  FileSearch,
  Newspaper,
  Orbit,
  ScrollText,
  Wifi,
  Zap,
} from "lucide-react";
import { useI18n } from "@/modules/i18n/context";
import type { MessageKey } from "@/modules/i18n/locales";

type GeoSnap = {
  layers: {
    points: { id: string; lat: number; lon: number; label: string; kind: string }[];
  }[];
  entityCount?: number;
  generatedAt: string;
};

const QUICK: { href: string; icon: typeof Eye; titleKey: MessageKey }[] = [
  { href: "/console/scrape", icon: Eye, titleKey: "nav.scrape" },
  { href: "/console/osint", icon: FileSearch, titleKey: "nav.osint" },
  { href: "/console/missions", icon: Bot, titleKey: "nav.agents" },
  { href: "/console/twins", icon: Orbit, titleKey: "nav.twins" },
  { href: "/console/wireless", icon: Wifi, titleKey: "nav.wireless" },
  { href: "/console/events", icon: Zap, titleKey: "nav.events" },
  { href: "/console/intelligence", icon: Newspaper, titleKey: "nav.intelligence" },
  { href: "/console/weather", icon: CloudSun, titleKey: "nav.weather" },
  { href: "/console/quantum", icon: Cpu, titleKey: "nav.quantum" },
  { href: "/console/consequence", icon: Brain, titleKey: "nav.consequence" },
  { href: "/console/audit", icon: ScrollText, titleKey: "nav.audit" },
];

export default function ConsoleHome() {
  const { t } = useI18n();
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [geo, setGeo] = useState<GeoSnap | null>(null);
  const [auditCount, setAuditCount] = useState(0);
  const [missions, setMissions] = useState(0);
  const [events, setEvents] = useState(0);
  const [twins, setTwins] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/health").then((r) => r.json()).catch(() => null),
      fetch("/api/v1/geospatial").then((r) => r.json()).catch(() => null),
      fetch("/api/v1/audit?limit=50").then((r) => r.json()).catch(() => null),
      fetch("/api/v1/hermes").then((r) => r.json()).catch(() => null),
      fetch("/api/v1/events?limit=5").then((r) => r.json()).catch(() => null),
      fetch("/api/v1/twins").then((r) => r.json()).catch(() => null),
    ]).then(([h, g, a, m, e, tw]) => {
      setHealth(h);
      setGeo(g);
      setAuditCount(a?.count || a?.events?.length || 0);
      setMissions(m?.runs?.length || 0);
      setEvents(e?.stats?.total || e?.events?.length || 0);
      setTwins(tw?.twins?.length || 0);
    });
  }, []);

  const points = geo?.layers?.flatMap((l) => l.points) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--lm-accent-display)]">
            {t("app.name")}
          </div>
          <h1 className="text-2xl font-semibold text-[var(--lm-text)]">
            {t("console.title")}
          </h1>
        </div>
        <div className="lm-badge lm-badge-live">
          {health ? t("status.online") : t("common.loading")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label={t("console.metrics.service")}
          value="HelixaraAI"
          hint=":3007"
          tone="cyan"
        />
        <MetricCard
          label={t("console.metrics.missions")}
          value={missions}
          hint="Hermes"
          tone="amber"
        />
        <MetricCard
          label={t("console.metrics.audit")}
          value={auditCount}
          tone="green"
        />
        <MetricCard
          label={t("nav.twins")}
          value={twins}
          hint="live"
          tone="cyan"
        />
        <MetricCard
          label={t("nav.events")}
          value={events}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lm-panel relative h-[380px] overflow-hidden rounded-lg lg:col-span-3">
          <GlobeCanvas points={points} mode="standard" />
        </div>

        <div className="lm-panel rounded-lg p-4 lg:col-span-2">
          <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--lm-muted)]">
            {t("console.quick")}
          </div>
          <div className="space-y-1">
            {QUICK.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded border border-transparent px-2 py-2 transition hover:border-[var(--lm-btn-border)] hover:bg-[var(--lm-btn-bg-a)]"
              >
                <a.icon className="h-4 w-4 shrink-0 text-[var(--lm-accent-display)]" />
                <div className="min-w-0 flex-1 text-sm text-[var(--lm-text)]">
                  {t(a.titleKey)}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--lm-muted)]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
