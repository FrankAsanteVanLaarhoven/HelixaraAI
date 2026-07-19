"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Eye,
  FileSearch,
  Globe2,
  LayoutDashboard,
  Radar,
  ScrollText,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/console", label: "Command", icon: LayoutDashboard },
  { href: "/console/scrape", label: "Stealth Crawl", icon: Eye },
  { href: "/console/osint", label: "OSINT", icon: FileSearch },
  { href: "/console/missions", label: "Agents", icon: Bot },
  { href: "/console/globe", label: "Geospatial", icon: Globe2 },
  { href: "/console/audit", label: "Audit", icon: ScrollText },
  { href: "/console/capabilities", label: "Capabilities", icon: Radar },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lm-grid">
      <header className="sticky top-0 z-40 border-b border-[var(--lm-border)] bg-[#05080fcc] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-400/40 bg-cyan-400/10">
              <Shield className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.12em] text-cyan-300 lm-glow">
                HelixaraAI
              </div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--lm-muted)]">
                Console · Sovereign Intel
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-4 text-[11px] text-[var(--lm-muted)] md:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--lm-green)] lm-pulse" />
              SYSTEMS NOMINAL
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              AUTH LAB MODE
            </span>
            <span className="lm-badge lm-badge-warn">ROE REQUIRED</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-4 px-4 py-4">
        <aside className="lm-panel hidden w-56 shrink-0 rounded-lg p-3 md:block">
          <nav className="space-y-1">
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
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded border border-[var(--lm-border)] bg-black/20 p-3 text-[11px] leading-relaxed text-[var(--lm-muted)]">
            <div className="mb-1 font-semibold uppercase tracking-wider text-cyan-300/80">
              Ethics lock
            </div>
            Authorized OSINT &amp; defensive testing only. Dark-web and deep ops
            require engagement attestation. All actions audited.
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
