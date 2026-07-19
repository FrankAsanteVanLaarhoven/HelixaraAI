import { NextResponse } from "next/server";
import { getLiveGeospatialSnapshot } from "@/modules/geospatial/live";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await getLiveGeospatialSnapshot();
    return NextResponse.json(snap);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "live geo failed" },
      { status: 502 }
    );
  }
}
