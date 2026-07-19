import { NextResponse } from "next/server";
import { ETHICS_NOTICE } from "@/lib/ethics/guardrails";
import { quantumCapabilityReport } from "@/modules/quantum/hybrid";
import { LOCALES } from "@/modules/i18n/locales";
import { probeProviders } from "@/modules/llm/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await probeProviders();
  return NextResponse.json({
    name: "HelixaraAI",
    version: "0.2.0",
    tagline: "Modular sovereign OSINT · stealth crawl · live Earth command",
    ethics: ETHICS_NOTICE,
    architecture: "modular monorepo (src/modules/* + src/lib/*)",
    gap: {
      problem:
        "Enterprises need self-hosted, audit-first fusion of stealth crawl, multi-agent LLM ops, live SSA/ADS-B, i18n, and hybrid optimizers — not a single SaaS scrape API.",
      vsFirecrawl: [
        "Sovereign self-host + ROE scopes + stealth tiers",
        "Hermes multi-agent + OpenClaw + Llama 3.1 / ChatGPT training",
        "Live CelesTrak NORAD GP + OpenSky + digital twins",
        "Full-site 20-language catalogs, FX, weather, news/alerts",
        "Event bus + SSE + quantum hybrid benchmarks",
      ],
    },
    industryBenchmarks: [
      {
        area: "SSA data",
        source: "CelesTrak NORAD GP (public catalog used industry-wide)",
        note: "Classified military feeds are not public; HelixaraAI uses the public GP sets defense research also relies on.",
      },
      {
        area: "ADS-B",
        source: "OpenSky Network",
        note: "Research-grade global civil aviation states",
      },
      {
        area: "Weather",
        source: "Open-Meteo",
        note: "7-day global forecast production free tier",
      },
      {
        area: "FX",
        source: "Frankfurter / ECB",
        note: "Daily reference rates",
      },
      {
        area: "Quantum",
        source: quantumCapabilityReport().status,
        note: "Narrow hybrids + classical surrogates; no false quantum-LLM claims",
      },
    ],
    llmProviders: providers,
    locales: LOCALES.map((l) => l.code),
    modules: [
      { id: "scrape", name: "Stealth Crawl Engine", status: "production-mvp" },
      { id: "osint", name: "Ethical OSINT", status: "production-mvp" },
      { id: "hermes", name: "Hermes multi-agent", status: "production-mvp" },
      { id: "openclaw", name: "OpenClaw gateway adapter", status: "integration" },
      { id: "llm", name: "Ollama Llama 3.1 + ChatGPT training", status: "production-mvp" },
      { id: "live-geo", name: "Live Earth (TLE + ADS-B + hubs)", status: "production-mvp" },
      { id: "twins", name: "Digital twins", status: "mvp" },
      { id: "events", name: "Real event bus + SSE", status: "production-mvp" },
      { id: "news", name: "Reddit + HN + USGS alerts", status: "production-mvp" },
      { id: "weather", name: "7-day weather", status: "production-mvp" },
      { id: "fx", name: "Multi-currency FX", status: "production-mvp" },
      { id: "i18n", name: `Full-site ${LOCALES.length} languages`, status: "production-mvp" },
      { id: "quantum", name: "Hybrid quantum optimizers", status: "hybrid-ready" },
      { id: "audit", name: "Audit & ROE", status: "production-mvp" },
    ],
  });
}
