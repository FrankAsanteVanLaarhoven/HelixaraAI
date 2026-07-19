import { NextResponse } from "next/server";
import { ETHICS_NOTICE } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

/** Capability matrix vs market gaps (Firecrawl, Maltego, SpiderFoot, etc.) */
export async function GET() {
  return NextResponse.json({
    name: "HelixaraAI",
    tagline: "Sovereign OSINT · Stealth Crawl · Mission Command",
    ethics: ETHICS_NOTICE,
    gap: {
      problem:
        "Enterprises and authorized gov teams lack a self-hosted console that fuses stealth crawling, ethical OSINT, agentic missions, geospatial fusion, and full audit/ROE — without SaaS data residency leakage.",
      vsFirecrawl: [
        "Self-hosted sovereign deployment (data never leaves your perimeter by default)",
        "Authorization scopes + engagement attestation on every sensitive action",
        "Stealth tiers with proxy/Tor hooks and human pacing",
        "Mission orchestration + OSINT correlation + geospatial pins on top of scrape",
        "Immutable audit NDJSON for compliance / chain-of-custody",
      ],
      vsMaltego: [
        "Modern HUD command UI + live globe layers",
        "Built-in ethical scrape engine (not just graph transforms)",
        "Agent swarm with Kanban-style mission board",
      ],
      vsSpiderFoot: [
        "Enterprise-grade UX and ROE guardrails first-class",
        "Stealth crawl profiles beyond classic scanner fingerprints",
      ],
    },
    modules: [
      {
        id: "scrape",
        name: "Stealth Crawl Engine",
        status: "mvp",
        kpis: ["robots-aware", "LLM-ready markdown/json", "proxy hooks"],
      },
      {
        id: "osint",
        name: "Ethical OSINT",
        status: "mvp",
        kpis: ["DNS/DoH", "CT logs", "HTTP hardening", "darkweb gated"],
      },
      {
        id: "agents",
        name: "Agentic Missions",
        status: "mvp",
        kpis: ["multi-role pipeline", "audit trail", "report draft"],
      },
      {
        id: "geospatial",
        name: "Geospatial Command",
        status: "mvp-demo",
        kpis: ["multi-layer globe", "ops nodes", "feed adapters"],
      },
      {
        id: "audit",
        name: "Audit & ROE",
        status: "mvp",
        kpis: ["NDJSON", "risk tags", "engagement ids"],
      },
      {
        id: "quantum",
        name: "Hybrid Quantum Optimizers",
        status: "roadmap",
        kpis: ["path planning", "graph clustering", "classical surrogates"],
      },
      {
        id: "wireless",
        name: "Wireless Recon (lab-only)",
        status: "roadmap",
        kpis: ["authorized lab nets only", "no default deauth tooling"],
      },
      {
        id: "4d",
        name: "4D Reconstruction",
        status: "roadmap",
        kpis: ["multi-cam fusion adapters", "timeline replay"],
      },
    ],
  });
}
