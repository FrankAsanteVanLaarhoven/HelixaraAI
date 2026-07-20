import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorisedUseBanner,
  listAdminAudit,
  loadWifiAdmin,
  offensiveCapabilities,
  saveWifiAdmin,
} from "@/modules/wireless/admin";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await loadWifiAdmin();
  return NextResponse.json({
    admin,
    offensive: offensiveCapabilities(),
    boundaries: authorisedUseBanner(),
    audit: listAdminAudit(40),
  });
}

const patchSchema = z.object({
  moduleEnabled: z.boolean().optional(),
  labModeEnabled: z.boolean().optional(),
  labAllowlist: z.array(z.string()).optional(),
  labSimRateLimitPerHour: z.number().int().min(1).max(500).optional(),
  maxFramesPerSim: z.number().int().min(1).max(500).optional(),
  widsIngestPerMinute: z.number().int().min(10).max(50000).optional(),
  hashMacsInUi: z.boolean().optional(),
  actor: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { actor, ...patch } = parsed.data;
    const admin = await saveWifiAdmin(patch, actor || operator.operatorId);

    await appendAudit({
      operatorId: operator.operatorId,
      action: "wireless.admin",
      allowed: true,
      risk: "medium",
      severity: "info",
      engagementId: operator.engagementId,
      details: patch,
    });

    return NextResponse.json({
      admin,
      offensive: offensiveCapabilities(),
      boundaries: authorisedUseBanner(),
      audit: listAdminAudit(20),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "admin failed" },
      { status: 500 }
    );
  }
}
