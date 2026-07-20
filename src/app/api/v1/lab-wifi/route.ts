import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { labSimCatalog, runLabSimulation } from "@/modules/wireless/lab_sim";
import { listWidsAlerts } from "@/modules/wireless/wids";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    catalog: labSimCatalog(),
    recentAlerts: listWidsAlerts(15),
  });
}

const runSchema = z.object({
  scenario: z.enum([
    "sim.deauth.broadcast_burst",
    "sim.deauth.targeted_client",
    "sim.disassoc.storm",
    "sim.benign.roam",
    "sim.mixed.noise",
  ]),
  engagementId: z.string().min(2),
  legalBasis: z.string().min(4),
  jurisdiction: z.string().optional(),
  bssid: z.string().min(5),
  clientMac: z.string().optional(),
  injectMode: z.enum(["bus", "rf"]).optional(),
  count: z.number().int().min(1).max(200).optional(),
});

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const json = await req.json();
    const parsed = runSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = runLabSimulation(parsed.data);

    await appendAudit({
      operatorId: operator.operatorId,
      action: "lab-wifi.sim",
      allowed: result.ok,
      risk: "medium",
      severity: result.ok ? "info" : "warn",
      engagementId: parsed.data.engagementId,
      details: {
        scenario: parsed.data.scenario,
        injectMode: parsed.data.injectMode || "bus",
        ok: result.ok,
        error: result.error,
        framesGenerated: result.framesGenerated,
        jurisdiction: parsed.data.jurisdiction || "UK",
      },
    });

    return NextResponse.json(
      {
        ...result,
        alerts: listWidsAlerts(15),
        catalog: labSimCatalog(),
      },
      { status: result.ok ? 200 : 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "lab-wifi failed" },
      { status: 500 }
    );
  }
}
