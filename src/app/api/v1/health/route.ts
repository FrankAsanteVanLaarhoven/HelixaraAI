import { NextResponse } from "next/server";
import { probeProviders } from "@/modules/llm/providers";
import { eventStats } from "@/modules/events/bus";
import { quantumCapabilityReport } from "@/modules/quantum/hybrid";
import { LOCALES } from "@/modules/i18n/locales";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await probeProviders();
  return NextResponse.json({
    status: "ok",
    service: "helixaraai",
    version: "0.2.0",
    port: 3007,
    ts: new Date().toISOString(),
    modular: true,
    modules: {
      scrape: true,
      osint: true,
      hermes: true,
      openclaw: true,
      llm: providers.map((p) => ({ id: p.id, available: p.available })),
      geospatialLive: true,
      satellites: "celestrak-norad-gp",
      adsb: "opensky",
      digitalTwins: true,
      quantum: quantumCapabilityReport().status,
      events: eventStats(),
      weather: "open-meteo-7d",
      news: "reddit+hn+usgs",
      fx: "frankfurter",
      i18n: { languages: LOCALES.length, fullCatalog: true },
      darkweb: "authorization-gated",
    },
  });
}
