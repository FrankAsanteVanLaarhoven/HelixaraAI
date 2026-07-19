import { NextRequest, NextResponse } from "next/server";
import { eventStats, listEvents, HelixEventType } from "@/modules/events/bus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(500, Number(req.nextUrl.searchParams.get("limit") || 80));
  const type = req.nextUrl.searchParams.get("type") as HelixEventType | null;
  const events = listEvents({
    limit,
    type: type || undefined,
  });
  return NextResponse.json({ events, stats: eventStats() });
}
