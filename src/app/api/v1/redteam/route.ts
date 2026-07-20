import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  attestRoe,
  createEngagement,
  getEngagement,
  listEngagements,
  listRoster,
  snapshot,
  upsertRosterMember,
} from "@/modules/redteam/store";
import { closeEngagement, runEngagement } from "@/modules/redteam/run";
import { ENGAGEMENT_TYPE_META, FORBIDDEN_ACTIVITIES } from "@/modules/redteam/types";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().min(2).max(160),
  type: z.enum([
    "external_recon",
    "internal_lab",
    "web_surface",
    "wireless_lab_observe",
    "reporting_only",
  ]),
  objective: z.string().min(4).max(4000),
  target: z.string().max(500).optional(),
  rosterIds: z.array(z.string()).optional(),
});

const attestSchema = z.object({
  action: z.literal("attest"),
  engagementId: z.string(),
  roeId: z.string().min(2).max(120),
  legalBasis: z.string().min(4).max(1000),
  scopeSummary: z.string().min(4).max(2000),
  inScopeTargets: z.array(z.string()).min(1),
  outOfScope: z.array(z.string()).optional(),
  expiresAt: z.string(),
  allowPrivateTargets: z.boolean().optional(),
  attestedBy: z.string().min(2).max(120),
});

const runSchema = z.object({
  action: z.literal("run"),
  engagementId: z.string(),
  useHermes: z.boolean().optional(),
});

const closeSchema = z.object({
  action: z.literal("close"),
  engagementId: z.string(),
});

const rosterSchema = z.object({
  action: z.literal("roster.upsert"),
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  role: z.enum(["lead", "recon", "osint", "analyst", "scribe", "observer"]),
  email: z.string().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const eng = getEngagement(id);
    if (!eng) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ engagement: eng, roster: listRoster() });
  }
  return NextResponse.json({
    ...snapshot(),
    forbidden: FORBIDDEN_ACTIVITIES,
    types: ENGAGEMENT_TYPE_META,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;
    const operator = demoOperator();

    if (action === "create") {
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const eng = createEngagement(parsed.data);
      await appendAudit({
        operatorId: operator.operatorId,
        action: "redteam.create",
        allowed: true,
        risk: "low",
        severity: "info",
        engagementId: eng.id,
        details: { type: eng.type, name: eng.name },
      });
      return NextResponse.json({ engagement: eng, engagements: listEngagements() });
    }

    if (action === "attest") {
      const parsed = attestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const eng = getEngagement(parsed.data.engagementId);
      if (!eng) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      const updated = attestRoe(eng, {
        engagementId: parsed.data.roeId,
        legalBasis: parsed.data.legalBasis,
        scopeSummary: parsed.data.scopeSummary,
        inScopeTargets: parsed.data.inScopeTargets,
        outOfScope: parsed.data.outOfScope,
        expiresAt: parsed.data.expiresAt,
        allowPrivateTargets: parsed.data.allowPrivateTargets,
        attestedBy: parsed.data.attestedBy,
      });
      await appendAudit({
        operatorId: operator.operatorId,
        action: "redteam.attest",
        allowed: true,
        risk: "medium",
        severity: "info",
        engagementId: updated.roe?.engagementId,
        details: { id: updated.id },
      });
      return NextResponse.json({ engagement: updated });
    }

    if (action === "run") {
      const parsed = runSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const eng = await runEngagement(parsed.data.engagementId, {
        useHermes: parsed.data.useHermes,
      });
      return NextResponse.json({ engagement: eng });
    }

    if (action === "close") {
      const parsed = closeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const eng = await closeEngagement(parsed.data.engagementId);
      return NextResponse.json({ engagement: eng });
    }

    if (action === "roster.upsert") {
      const parsed = rosterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const member = upsertRosterMember(parsed.data);
      return NextResponse.json({ member, roster: listRoster() });
    }

    return NextResponse.json(
      {
        error: "unknown action",
        allowed: ["create", "attest", "run", "close", "roster.upsert"],
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "redteam failed" },
      { status: 500 }
    );
  }
}
