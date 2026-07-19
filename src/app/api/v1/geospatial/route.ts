import { NextResponse } from "next/server";
import { getGeospatialSnapshot } from "@/lib/geospatial/feeds";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET() {
  const operator = demoOperator();
  const snap = getGeospatialSnapshot();
  await appendAudit({
    operatorId: operator.operatorId,
    action: "geospatial.read",
    allowed: true,
    risk: "low",
    severity: "info",
    engagementId: operator.engagementId,
    details: { layers: snap.layers.length },
  });
  return NextResponse.json(snap);
}
