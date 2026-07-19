import { NextRequest, NextResponse } from "next/server";
import {
  addManualTelemetry,
  getTelemetrySnapshot,
} from "@/modules/telemetry/entries";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getTelemetrySnapshot());
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
