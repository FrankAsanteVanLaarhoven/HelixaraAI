import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getWifiState,
  runWifiScan,
  selectWifiTarget,
} from "@/modules/wireless/scan";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getWifiState());
}

const selectSchema = z.object({
  action: z.literal("select"),
  networkId: z.string().min(1),
  clientId: z.string().optional(),
  engagementId: z.string().min(2),
  legalBasis: z.string().min(4),
});

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const body = await req.json();
    const action = body.action as string | undefined;

    if (action === "scan" || !action) {
      const result = await runWifiScan();
      await appendAudit({
        operatorId: operator.operatorId,
        action: "wireless.scan",
        allowed: true,
        risk: "medium",
        severity: "info",
        engagementId: operator.engagementId,
        details: {
          scanId: result.scanId,
          live: result.live,
          networks: result.networks.length,
          method: result.method,
        },
      });
      return NextResponse.json(result);
    }

    if (action === "select") {
      const parsed = selectSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid select body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const out = selectWifiTarget({
        networkId: parsed.data.networkId,
        clientId: parsed.data.clientId,
        engagementId: parsed.data.engagementId,
        legalBasis: parsed.data.legalBasis,
      });
      await appendAudit({
        operatorId: operator.operatorId,
        action: "wireless.select",
        allowed: out.ok,
        risk: "medium",
        severity: out.ok ? "info" : "warn",
        engagementId: parsed.data.engagementId,
        details: {
          networkId: parsed.data.networkId,
          clientId: parsed.data.clientId,
          error: out.error,
        },
      });
      if (!out.ok) {
        return NextResponse.json(out, { status: 400 });
      }
      return NextResponse.json(out);
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "wireless failed" },
      { status: 500 }
    );
  }
}
