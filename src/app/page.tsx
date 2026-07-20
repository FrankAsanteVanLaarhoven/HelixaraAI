"use client";

import Link from "next/link";
import {
  Bot,
  Eye,
  Globe2,
  Radar,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useI18n } from "@/modules/i18n/context";
import type { LocaleCode } from "@/modules/i18n/locales";
import { ThemeToggle } from "@/components/console/ThemeToggle";

export default function HomePage() {
  const { t, locale, setLocale, locales, dir } = useI18n();

  return (
    <div className="min-h-screen lm-grid" dir={dir}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[var(--lm-accent-display)]">
            <Shield className="h-4 w-4" />
            {t("app.name")} v0.2 · {t("app.authorized")} · :3007
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <select
              className="lm-input w-auto text-xs"
              value={locale}
              onChange={(e) => setLocale(e.target.value as LocaleCode)}
            >
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[var(--lm-text)] md:text-5xl">
          {t("home.hero")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--lm-muted)] md:text-lg">
          {t("home.sub")}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/console" className="lm-btn px-5 py-2.5 text-base">
            <Radar className="h-4 w-4" />
            {t("home.cta.console")}
          </Link>
          <Link
            href="/console/capabilities"
            className="lm-btn lm-btn-amber px-5 py-2.5 text-base"
          >
            {t("home.cta.capabilities")}
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Eye,
              title: t("home.card.scrape"),
              body: t("home.card.scrape.desc"),
            },
            {
              icon: ShieldCheck,
              title: t("home.card.osint"),
              body: t("home.card.osint.desc"),
            },
            {
              icon: Bot,
              title: t("home.card.agents"),
              body: t("home.card.agents.desc"),
            },
            {
              icon: Globe2,
              title: t("home.card.globe"),
              body: t("home.card.globe.desc"),
            },
          ].map((c) => (
            <div key={c.title} className="lm-panel rounded-lg p-5">
              <c.icon className="mb-3 h-5 w-5 text-cyan-300" />
              <div className="font-medium text-[var(--lm-text)]">{c.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--lm-muted)]">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100/90">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>{t("home.scope")}</p>
        </div>
      </div>
    </div>
  );
}
