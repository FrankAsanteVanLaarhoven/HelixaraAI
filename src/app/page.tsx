"use client";

import Link from "next/link";
import {
  Bot,
  Brain,
  Eye,
  FileSearch,
  Globe2,
  LayoutDashboard,
  Orbit,
  Radar,
  Shield,
  Wifi,
} from "lucide-react";
import { useI18n } from "@/modules/i18n/context";
import type { LocaleCode } from "@/modules/i18n/locales";
import { ThemeToggle } from "@/components/console/ThemeToggle";

const MODULES = [
  { href: "/console", icon: LayoutDashboard, titleKey: "nav.command" as const },
  { href: "/console/scrape", icon: Eye, titleKey: "nav.scrape" as const },
  { href: "/console/osint", icon: FileSearch, titleKey: "nav.osint" as const },
  { href: "/console/missions", icon: Bot, titleKey: "nav.agents" as const },
  { href: "/console/globe", icon: Globe2, titleKey: "nav.globe" as const },
  { href: "/console/twins", icon: Orbit, titleKey: "nav.twins" as const },
  { href: "/console/wireless", icon: Wifi, titleKey: "nav.wireless" as const },
  { href: "/console/consequence", icon: Brain, titleKey: "nav.consequence" as const },
];

export default function HomePage() {
  const { t, locale, setLocale, locales, dir } = useI18n();

  return (
    <div className="min-h-screen lm-grid" dir={dir}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[var(--lm-accent-display)]">
            <Shield className="h-4 w-4" />
            {t("app.name")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <select
              className="lm-input w-auto text-xs"
              value={locale}
              onChange={(e) => setLocale(e.target.value as LocaleCode)}
              aria-label={t("common.language")}
            >
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[var(--lm-text)] md:text-5xl">
          {t("app.name")}
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.2em] text-[var(--lm-muted)]">
          {t("app.tagline")}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/console" className="lm-btn px-5 py-2.5 text-base">
            <Radar className="h-4 w-4" />
            {t("home.cta.console")}
          </Link>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="lm-panel group rounded-lg p-4 transition hover:border-[var(--lm-btn-hover-border)]"
            >
              <m.icon className="mb-3 h-5 w-5 text-[var(--lm-accent-display)]" />
              <div className="text-sm font-medium text-[var(--lm-text)] group-hover:text-[var(--lm-accent-display)]">
                {t(m.titleKey)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
