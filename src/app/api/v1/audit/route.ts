import { NextRequest, NextResponse } from "next/server";
import { listAudit, loadAuditFromDisk } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    500,
    Number(req.nextUrl.searchParams.get("limit") || 100) || 100
  );
  const disk = await loadAuditFromDisk(limit);
  const mem = listAudit(limit);
  // prefer whichever has more recent coverage
  const events = disk.length >= mem.length ? disk : mem;
  return NextResponse.json({ events: events.slice(0, limit), count: events.length });
}
