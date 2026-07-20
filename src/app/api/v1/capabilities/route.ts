import { NextResponse } from "next/server";
import { quantumCapabilityReport } from "@/modules/quantum/hybrid";
import { LOCALES } from "@/modules/i18n/locales";
import { probeProviders } from "@/modules/llm/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await probeProviders();
  return NextResponse.json({
    name: "HelixaraAI",
    version: "0.2.0",
    architecture: "modular monorepo (src/modules/* + src/lib/*)",
    dataSources: [
      { area: "SSA", source: "CelesTrak NORAD GP" },
      { area: "ADS-B", source: "OpenSky Network" },
      { area: "Weather", source: "Open-Meteo" },
      { area: "FX", source: "Frankfurter / ECB" },
      {
        area: "Quantum",
        source: quantumCapabilityReport().status,
      },
    ],
    llmProviders: providers,
    locales: LOCALES.map((l) => l.code),
    modules: [
      { id: "scrape", name: "Crawl", status: "active" },
      { id: "osint", name: "OSINT", status: "active" },
      { id: "hermes", name: "Hermes", status: "active" },
      { id: "redteam", name: "Red Team (ROE recon)", status: "active" },
      { id: "bounty", name: "Bug bounty find/restore", status: "active" },
      { id: "pwa", name: "PWA offline shell", status: "active" },
      { id: "sdk", name: "HelixaraClient SDK", status: "active" },
      { id: "webrtc", name: "WebRTC live rooms", status: "active" },
      { id: "webgl", name: "WebGL live video views", status: "active" },
      { id: "openclaw", name: "OpenClaw", status: "integration" },
      { id: "llm", name: "LLM", status: "active" },
      { id: "live-geo", name: "Geospatial", status: "active" },
      { id: "twins", name: "Twins", status: "active" },
      { id: "events", name: "Events", status: "active" },
      { id: "news", name: "News", status: "active" },
      { id: "weather", name: "Weather", status: "active" },
      { id: "fx", name: "FX", status: "active" },
      { id: "i18n", name: `i18n (${LOCALES.length})`, status: "active" },
      { id: "quantum", name: "Quantum", status: "hybrid" },
      { id: "audit", name: "Audit", status: "active" },
    ],
  });
}
