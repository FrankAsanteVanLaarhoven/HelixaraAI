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

export default function HomePage() {
  return (
    <div className="min-h-screen lm-grid">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">
          <Shield className="h-4 w-4" />
          HelixaraAI v0.1 · Authorized Use Only
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[var(--lm-text)] md:text-6xl">
          Sovereign command for{" "}
          <span className="text-cyan-300 lm-glow">ethical OSINT</span>, stealth
          crawl, and mission intelligence.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--lm-muted)] md:text-lg">
          The market gap: Firecrawl scrapes. Maltego graphs. Palantir is closed
          and heavy. Nothing self-hosted fuses military-grade stealth crawling,
          ROE guardrails, agentic missions, and geospatial fusion into one
          auditable console. HelixaraAI does.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/console" className="lm-btn px-5 py-2.5 text-base">
            <Radar className="h-4 w-4" />
            Enter Command Console
          </Link>
          <Link href="/console/capabilities" className="lm-btn lm-btn-amber px-5 py-2.5 text-base">
            Capability Matrix
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Eye,
              title: "Stealth Crawl",
              body: "robots-aware, proxy/Tor hooks, human pacing — built to outclass SaaS scrapers on sovereignty and audit.",
            },
            {
              icon: ShieldCheck,
              title: "Ethical OSINT",
              body: "DNS, CT logs, HTTP hardening. Dark-web channel is authorization-gated — never default-on.",
            },
            {
              icon: Bot,
              title: "Agent Missions",
              body: "Multi-role recon → enrich → analyze → report pipeline with full chain-of-custody.",
            },
            {
              icon: Globe2,
              title: "Geospatial HUD",
              body: "Ops nodes, satellite/ADS-B/AIS demo layers, threat pins ready for live feeds.",
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
          <p>
            <strong className="text-amber-200">Hard scope:</strong> HelixaraAI is for
            lawful OSINT and authorized security testing only. No exploit
            generation, no default wireless attacks, no criminal dark-web
            automation. Every sensitive action is audited against engagement IDs.
          </p>
        </div>
      </div>
    </div>
  );
}
