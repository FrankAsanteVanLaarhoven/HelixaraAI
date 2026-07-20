"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  CloudSun,
  Columns3,
  Cpu,
  Eye,
  FileSearch,
  Globe2,
  LayoutDashboard,
  MapPinned,
  MonitorSmartphone,
  Newspaper,
  Orbit,
  Radar,
  ScrollText,
  Shield,
  FlaskConical,
  Box,
  Brain,
  Settings,
  ShieldAlert,
  Swords,
  Wifi,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/modules/i18n/context";
import type { MessageKey } from "@/modules/i18n/locales";
import type { LocaleCode } from "@/modules/i18n/locales";
import { ThemeToggle } from "@/components/console/ThemeToggle";

const NAV: { href: string; key: MessageKey; icon: typeof LayoutDashboard }[] = [
  { href: "/console", key: "nav.command", icon: LayoutDashboard },
  { href: "/console/os", key: "nav.os", icon: MonitorSmartphone },
  { href: "/console/consequence", key: "nav.consequence", icon: Brain },
  { href: "/console/worldview", key: "nav.worldview", icon: Box },
  { href: "/console/scrape", key: "nav.scrape", icon: Eye },
  { href: "/console/osint", key: "nav.osint", icon: FileSearch },
  { href: "/console/missions", key: "nav.agents", icon: Bot },
  { href: "/console/redteam", key: "nav.redteam", icon: Swords },
  { href: "/console/redteam/kits", key: "nav.rtKits", icon: FlaskConical },
  { href: "/console/redteam/awareness", key: "nav.rtAware", icon: Eye },
  { href: "/console/redteam/rf-sim", key: "nav.rtRf", icon: Wifi },
  { href: "/console/redteam/attack", key: "nav.rtAttack", icon: ShieldAlert },
  { href: "/console/redteam/purple", key: "nav.rtPurple", icon: Columns3 },
  { href: "/console/redteam/workspace?side=red", key: "nav.rtWs", icon: LayoutDashboard },
  { href: "/console/kanban", key: "nav.kanban", icon: Columns3 },
  { href: "/console/telemetry", key: "nav.telemetry", icon: MapPinned },
  { href: "/console/wireless", key: "nav.wireless", icon: Wifi },
  { href: "/console/wids", key: "nav.wids", icon: ShieldAlert },
  { href: "/console/lab-wifi", key: "nav.labwifi", icon: FlaskConical },
  { href: "/console/wireless-admin", key: "nav.wifiadmin", icon: Settings },
  { href: "/console/globe", key: "nav.globe", icon: Globe2 },
  { href: "/console/events", key: "nav.events", icon: Zap },
  { href: "/console/intelligence", key: "nav.intelligence", icon: Newspaper },
  { href: "/console/weather", key: "nav.weather", icon: CloudSun },
  { href: "/console/quantum", key: "nav.quantum", icon: Cpu },
  { href: "/console/twins", key: "nav.twins", icon: Orbit },
  { href: "/console/admin/elevated", key: "nav.elevated", icon: Settings },
  { href: "/console/audit", key: "nav.audit", icon: ScrollText },
  { href: "/console/capabilities", key: "nav.capabilities", icon: Radar },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale, setLocale, currency, setCurrency, locales, dir } = useI18n();

  return (
    <div className="min-h-screen lm-grid" dir={dir}>
      <header className="lm-header-bar sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[var(--lm-btn-border)] bg-[var(--lm-btn-bg-a)]">
              <Shield className="h-5 w-5 text-[var(--lm-accent-display)]" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.12em] text-[var(--lm-accent-display)] lm-glow">
                {t("app.name")}
              </div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--lm-muted)]">
                {t("app.tagline")}
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--lm-muted)]">
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--lm-green-bright)] lm-pulse" />
              {t("status.systems")}
            </span>
            <span className="hidden items-center gap-1.5 md:flex">
              <Activity className="h-3.5 w-3.5" />
              :3007
            </span>
            <ThemeToggle />
            <span className="lm-badge lm-badge-warn">{t("status.roe")}</span>

            <label className="flex items-center gap-1">
              <span className="sr-only">{t("common.language")}</span>
              <select
                className="lm-input w-auto py-1 text-[11px]"
                value={locale}
                onChange={(e) => setLocale(e.target.value as LocaleCode)}
                title={t("common.language")}
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="sr-only">{t("common.currency")}</span>
              <select
                className="lm-input w-auto py-1 text-[11px]"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                title={t("common.currency")}
              >
                {["USD", "EUR", "GBP", "JPY", "CNY", "INR", "AED", "SGD", "AUD", "BRL"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-4 px-4 py-4">
        <aside className="lm-panel hidden w-56 shrink-0 rounded-lg p-3 lg:block">
          <nav className="max-h-[70vh] space-y-1 overflow-y-auto">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/console" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded px-3 py-2 text-sm transition",
                    active
                      ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/30"
                      : "text-[var(--lm-muted)] hover:bg-white/5 hover:text-[var(--lm-text)] border border-transparent"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>

        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
