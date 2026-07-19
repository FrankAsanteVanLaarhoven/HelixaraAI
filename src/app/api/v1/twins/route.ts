import { NextResponse } from "next/server";
import { listDigitalTwins } from "@/modules/geospatial/live";
import { emitEvent } from "@/modules/events/bus";

export const dynamic = "force-dynamic";

export async function GET() {
  const twins = listDigitalTwins();
  emitEvent({
    type: "twin.synced",
    source: "api.twins",
    severity: "info",
    title: `Digital twins listed · ${twins.length}`,
  });
  return NextResponse.json({
    twins,
    fidelityModel: {
      levels: ["low", "medium", "high"],
      sync: "event-driven + poll",
      productionPath: "bind to CMDB / cloud inventory / OT sensors",
    },
  });
}
