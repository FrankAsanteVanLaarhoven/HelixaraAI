import { NextResponse } from "next/server";
import { getLiveGeospatialSnapshot } from "@/modules/geospatial/live";
import { getGeospatialSnapshot } from "@/lib/geospatial/feeds";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET() {
  const operator = demoOperator();
  try {
    const live = await getLiveGeospatialSnapshot();
    await appendAudit({
      operatorId: operator.operatorId,
      action: "geospatial.live",
      allowed: true,
      risk: "low",
      severity: "info",
      engagementId: operator.engagementId,
      details: {
        entities: live.entities.length,
        sources: live.sources.length,
      },
    });

    // Adapter for existing GlobeCanvas (points shape)
    const layers = [
      {
        id: "satellites",
        name: "NORAD GP · CelesTrak (public)",
        description: "Public element sets used across SSA research",
        live: true,
        points: live.entities
          .filter((e) => e.kind === "satellite")
          .map((e) => ({
            id: e.id,
            lat: e.lat,
            lon: e.lon,
            label: e.label,
            kind: e.kind,
            meta: e.meta,
          })),
      },
      {
        id: "adsb",
        name: "ADS-B · OpenSky",
        description: "Live civil aviation state vectors",
        live: true,
        points: live.entities
          .filter((e) => e.kind === "flight")
          .map((e) => ({
            id: e.id,
            lat: e.lat,
            lon: e.lon,
            label: e.label,
            kind: e.kind,
            meta: e.meta,
          })),
      },
      {
        id: "airports",
        name: "Airline hubs",
        description: "Global visibility anchors",
        live: false,
        points: live.entities
          .filter((e) => e.kind === "airport")
          .map((e) => ({
            id: e.id,
            lat: e.lat,
            lon: e.lon,
            label: e.label,
            kind: "infra",
            meta: e.meta,
          })),
      },
      {
        id: "twins",
        name: "Digital twins",
        description: "Live SOC / edge twins",
        live: true,
        points: live.entities
          .filter((e) => e.kind === "twin")
          .map((e) => ({
            id: e.id,
            lat: e.lat,
            lon: e.lon,
            label: e.label,
            kind: "ops",
            meta: e.meta,
          })),
      },
    ];

    return NextResponse.json({
      generatedAt: live.generatedAt,
      modes: ["standard", "night", "crt", "thermal"],
      layers,
      regions: live.regions,
      sources: live.sources,
      benchmarks: live.benchmarks,
      entityCount: live.entities.length,
    });
  } catch {
    // fallback demo layers
    const snap = getGeospatialSnapshot();
    return NextResponse.json({ ...snap, fallback: true });
  }
}
