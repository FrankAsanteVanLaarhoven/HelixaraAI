import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  approveCapability,
  getElevatedSnapshot,
  revokeCapability,
  revokeSession,
  verifyElevatedRole,
  type ElevatedCapabilityId,
  ELEVATED_CAPABILITIES,
} from "@/modules/auth/elevated";
import { appendAudit } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await getElevatedSnapshot();
  return NextResponse.json(snap);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "verify") {
      const parsed = z
        .object({
          role: z.enum(["owner", "superadmin"]),
          identity: z.string().min(2).max(120),
          token: z.string().min(4),
          ttlMinutes: z.number().optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      const result = await verifyElevatedRole(parsed.data);
      if (!result.ok) {
        await appendAudit({
          operatorId: parsed.data.identity,
          action: "elevated.verify.fail",
          allowed: false,
          risk: "high",
          severity: "warn",
          details: { role: parsed.data.role, reason: result.reason },
        });
        return NextResponse.json(result, { status: 403 });
      }
      await appendAudit({
        operatorId: parsed.data.identity,
        action: "elevated.verify.ok",
        allowed: true,
        risk: "high",
        severity: "info",
        details: { role: parsed.data.role, sessionId: result.session.sessionId },
      });
      return NextResponse.json({
        ok: true,
        session: result.session,
        // surface session id for client storage — token never returned
      });
    }

    if (action === "logout") {
      const sessionId = String(body.sessionId || "");
      if (sessionId) await revokeSession(sessionId);
      return NextResponse.json({ ok: true });
    }

    if (action === "approve") {
      const parsed = z
        .object({
          sessionId: z.string().min(4),
          capability: z.string(),
          engagementId: z.string().min(2),
          legalBasis: z.string().min(4),
          expiresAt: z.string(),
          note: z.string().optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      if (!(parsed.data.capability in ELEVATED_CAPABILITIES)) {
        return NextResponse.json({ error: "unknown capability" }, { status: 400 });
      }
      const result = await approveCapability({
        ...parsed.data,
        capability: parsed.data.capability as ElevatedCapabilityId,
      });
      if (!result.ok) {
        return NextResponse.json(result, { status: 403 });
      }
      await appendAudit({
        operatorId: "elevated",
        action: "elevated.approve",
        allowed: true,
        risk: "critical",
        severity: "info",
        engagementId: parsed.data.engagementId,
        details: {
          capability: parsed.data.capability,
          status: result.grant.status,
          approvals: result.grant.approvals.map((a) => a.role),
        },
      });
      return NextResponse.json(result);
    }

    if (action === "revoke") {
      const parsed = z
        .object({
          sessionId: z.string().min(4),
          capability: z.string(),
          reason: z.string().optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      if (!(parsed.data.capability in ELEVATED_CAPABILITIES)) {
        return NextResponse.json({ error: "unknown capability" }, { status: 400 });
      }
      const result = await revokeCapability({
        sessionId: parsed.data.sessionId,
        capability: parsed.data.capability as ElevatedCapabilityId,
        reason: parsed.data.reason,
      });
      if (!result.ok) {
        return NextResponse.json(result, { status: 403 });
      }
      await appendAudit({
        operatorId: "elevated",
        action: "elevated.revoke",
        allowed: true,
        risk: "high",
        severity: "info",
        details: { capability: parsed.data.capability },
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        error: "unknown action",
        allowed: ["verify", "logout", "approve", "revoke"],
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "elevated admin failed" },
      { status: 500 }
    );
  }
}
