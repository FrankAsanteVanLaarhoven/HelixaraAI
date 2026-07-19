"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/console/MetricCard";
import { GlobeCanvas } from "@/components/console/GlobeCanvas";
import { ArrowRight, Bot, Eye, FileSearch, ScrollText } from "lucide-react";

type GeoSnap = {
  layers: { points: { id: string; lat: number; lon: number; label: string; kind: string }[] }[];
  generatedAt: string;
};

export default function ConsoleHome() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [geo, setGeo] = useState<GeoSnap | null>(null);
  const [auditCount, setAuditCount] = useState(0);
  const [missions, setMissions] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/health").then((r) => r.json()),
      fetch("/api/v1/geospatial").then((r) => r.json()),
      fetch("/api/v1/audit?limit=50").then((r) => r.json()),
      fetch("/api/v1/missions").then((r) => r.json()),
    ]).then(([h, g, a, m]) => {
      setHealth(h);
      setGeo(g);
      setAuditCount(a.count || a.events?.length || 0);
      setMissions(m.missions?.length || 0);
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
            Command Overview
          </h1>
          <p className="mt-1 text-sm text-[var(--lm-muted)]">
            Unified dashboard for stealth crawl, OSINT fusion, agent missions, and
            geospatial situational awareness.
          </p>
        </div>
        <div className="lm-badge lm-badge-live">
          {health ? "API ONLINE" : "CONNECTING…"}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Service" value="HelixaraAI" hint="v0.1.0 · self-hosted" tone="cyan" />
        <MetricCard label="Missions" value={missions} hint="agent pipelines" tone="amber" />
        <MetricCard label="Audit events" value={auditCount} hint="session + disk" tone="green" />
        <MetricCard
          label="Geo layers"
          value={geo?.layers.length ?? "—"}
          hint="live demo feeds"
          tone="cyan"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lm-panel relative h-[380px] overflow-hidden rounded-lg lg:col-span-3">
          <GlobeCanvas points={points} mode="standard" />
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div className="lm-panel rounded-lg p-4">
            <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--lm-muted)]">
              Quick actions
            </div>
            <div className="space-y-2">
              {[
                {
                  href: "/console/scrape",
                  icon: Eye,
                  title: "Launch stealth scrape",
                  desc: "Surface or deep crawl with ROE checks",
                },
                {
                  href: "/console/osint",
                  icon: FileSearch,
                  title: "Run OSINT enrichment",
                  desc: "DNS · CT · headers · gated dark-web",
                },
                {
                  href: "/console/missions",
                  icon: Bot,
                  title: "Start agent mission",
                  desc: "Multi-role recon → report",
                },
                {
                  href: "/console/audit",
                  icon: ScrollText,
                  title: "Review audit trail",
                  desc: "Chain-of-custody for operators",
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
                    <div className="text-[11px] text-[var(--lm-muted)]">{a.desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--lm-muted)]" />
                </Link>
              ))}
            </div>
          </div>

          <div className="lm-panel rounded-lg p-4 text-sm text-[var(--lm-muted)]">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
              Market position
            </div>
            Surpasses single-purpose scrapers by shipping{" "}
            <span className="text-[var(--lm-text)]">sovereignty</span>,{" "}
            <span className="text-[var(--lm-text)]">stealth profiles</span>,{" "}
            <span className="text-[var(--lm-text)]">agent missions</span>, and{" "}
            <span className="text-[var(--lm-text)]">geospatial fusion</span> with
            mandatory ethics locks — the stack enterprise SOCs actually need.
          </div>
        </div>
      </div>
    </div>
  );
}
