import { NextRequest, NextResponse } from "next/server";
import {
  addManualTelemetry,
  getTelemetrySnapshot,
} from "@/modules/telemetry/entries";
import { getLiveGeospatialSnapshot } from "@/modules/geospatial/live";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const includeLive =
    req.nextUrl.searchParams.get("live") !== "0" &&
    req.nextUrl.searchParams.get("live") !== "false";

  const base = getTelemetrySnapshot();

  if (!includeLive) {
    return NextResponse.json(base);
  }

  try {
    const live = await getLiveGeospatialSnapshot();
    const sats = live.entities.filter((e) => e.kind === "satellite");
    const flights = live.entities.filter((e) => e.kind === "flight");
    const twins = live.entities.filter((e) => e.kind === "twin");
    const airports = live.entities.filter((e) => e.kind === "airport");

    return NextResponse.json({
      ...base,
      live: true,
      generatedAt: live.generatedAt,
      sources: live.sources,
      regions: live.regions,
      counts: {
        entries: base.entries.length,
        satellites: sats.length,
        flights: flights.length,
        twins: twins.length,
        airports: airports.length,
        total: live.entities.length + base.entries.length,
      },
      layers: {
        satellites: sats.map((e) => ({
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          label: e.label,
          kind: "satellite" as const,
          altKm: e.altKm,
          meta: e.meta,
          source: e.source,
          ts: e.ts,
        })),
        flights: flights.map((e) => ({
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          label: e.label,
          kind: "flight" as const,
          altKm: e.altKm,
          meta: e.meta,
          source: e.source,
          ts: e.ts,
        })),
        twins: twins.map((e) => ({
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          label: e.label,
          kind: "twin" as const,
          meta: e.meta,
          source: e.source,
          ts: e.ts,
        })),
        airports: airports.map((e) => ({
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          label: e.label,
          kind: "airport" as const,
          meta: e.meta,
          source: e.source,
          ts: e.ts,
        })),
        ops: base.entries.map((e) => ({
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          label: e.place || e.label,
          kind:
            e.kind === "ops"
              ? "ops"
              : e.kind === "scrape"
                ? "infra"
                : e.kind === "osint"
                  ? "threat"
                  : "sensor",
          meta: { ...e.meta, entryKind: e.kind, ip: e.ip, place: e.place },
          ts: e.ts,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({
      ...base,
      live: false,
      error: err instanceof Error ? err.message : "live fusion failed",
      counts: {
        entries: base.entries.length,
        satellites: 0,
        flights: 0,
        twins: 0,
        airports: 0,
        total: base.entries.length,
      },
      layers: {
        satellites: [],
        flights: [],
        twins: [],
        airports: [],
        ops: base.entries.map((e) => ({
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          label: e.place || e.label,
          kind: "ops",
          ts: e.ts,
        })),
      },
      regions: [
        { id: "global", name: "Global", lat: 20, lon: 0, zoom: 1 },
      ],
      sources: [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = addManualTelemetry({
      label: String(body.label || "Manual pin"),
      lat: Number(body.lat),
      lon: Number(body.lon),
      place: body.place,
      kind: body.kind || "manual",
    });
    return NextResponse.json({ entry, ...getTelemetrySnapshot() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "telemetry failed" },
      { status: 500 }
    );
  }
}
