import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "helixaraai",
    version: "0.1.0",
    ts: new Date().toISOString(),
    modules: {
      scrape: true,
      osint: true,
      agents: true,
      geospatial: true,
      audit: true,
      darkweb: "authorization-gated",
      quantum: "planned-hybrid",
    },
  });
}
