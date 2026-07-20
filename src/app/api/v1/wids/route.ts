import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ingestWidsFrames,
  listRecentFrames,
  listWidsAlerts,
  widsStatus,
  type WidsFrameEvent,
} from "@/modules/wireless/wids";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    200,
    Number(req.nextUrl.searchParams.get("limit") || 50)
  );
  return NextResponse.json({
    status: widsStatus(),
    alerts: listWidsAlerts(limit),
    frames: listRecentFrames(Math.min(100, limit)),
  });
}

const frameSchema = z.object({
  ts: z.string().optional(),
  type: z.enum(["deauth", "disassoc", "other_mgmt"]),
  transmitter: z.string().min(5),
  receiver: z.string().min(5),
  bssid: z.string().min(5),
  reasonCode: z.number().optional(),
  channel: z.number().optional(),
  rssi: z.number().optional(),
  sensorId: z.string().optional(),
  engagementId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const body = await req.json();
    const events = Array.isArray(body.events) ? body.events : [body];
    const parsed: WidsFrameEvent[] = [];
    for (const e of events) {
      const p = frameSchema.safeParse(e);
      if (p.success) {
        parsed.push({
          ...p.data,
          ts: p.data.ts || new Date().toISOString(),
        });
      }
    }
    if (!parsed.length) {
      return NextResponse.json({ error: "no valid frames" }, { status: 400 });
    }

    const result = ingestWidsFrames(parsed, {
      requireEngagement: body.requireEngagement === true,
    });

    await appendAudit({
      operatorId: operator.operatorId,
      action: "wids.ingest",
      allowed: true,
      risk: "low",
      severity: "info",
      engagementId: operator.engagementId,
      details: result,
    });

    return NextResponse.json({
      ...result,
      status: widsStatus(),
      alerts: listWidsAlerts(20),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "wids failed" },
      { status: 500 }
    );
  }
}
