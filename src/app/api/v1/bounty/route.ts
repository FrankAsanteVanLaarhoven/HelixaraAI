import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createProgram,
  getFinding,
  getProgram,
  getRestore,
  listFindings,
  listProgramAssets,
  listPrograms,
  listRestores,
  saveFinding,
  snapshot,
} from "@/modules/bounty/store";
import { runBountyScan } from "@/modules/bounty/scan";
import {
  discoverProgramSites,
  runDynamicScanAll,
} from "@/modules/bounty/discover";
import {
  advanceRestoreStep,
  completeRestore,
  createRestoreJob,
  runRestoreHealthProbe,
} from "@/modules/bounty/restore";
import { ALL_CHECKS, CHECK_META } from "@/modules/bounty/types";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const kind = req.nextUrl.searchParams.get("kind");
  if (kind === "checks") {
    return NextResponse.json({ checks: CHECK_META, all: ALL_CHECKS });
  }
  if (kind === "finding" && id) {
    const f = getFinding(id);
    if (!f) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      finding: f,
      restore: f.restoreJobId ? getRestore(f.restoreJobId) : null,
    });
  }
  if (kind === "restore" && id) {
    const r = getRestore(id);
    if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ restore: r, finding: getFinding(r.findingId) });
  }
  if (kind === "program" && id) {
    const p = getProgram(id);
    if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      program: p,
      findings: listFindings(id, 200),
      assets: listProgramAssets(id),
    });
  }
  if (kind === "assets" && id) {
    return NextResponse.json({
      programId: id,
      assets: listProgramAssets(id),
    });
  }
  return NextResponse.json({
    ...snapshot(),
    checks: CHECK_META,
  });
}

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "program.create") {
      const parsed = z
        .object({
          name: z.string().min(2),
          owner: z.string().min(2),
          engagementId: z.string().min(2),
          legalBasis: z.string().min(4),
          inScope: z.array(z.string()).min(1),
          outOfScope: z.array(z.string()).optional(),
          notes: z.string().optional(),
          expiresAt: z.string().optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const program = createProgram(parsed.data);
      await appendAudit({
        operatorId: operator.operatorId,
        action: "bounty.program.create",
        allowed: true,
        risk: "low",
        severity: "info",
        engagementId: program.engagementId,
        details: { id: program.id, inScope: program.inScope },
      });
      return NextResponse.json({ program, programs: listPrograms() });
    }

    if (action === "scan") {
      const parsed = z
        .object({
          programId: z.string(),
          target: z.string().min(2),
          checks: z.array(z.string()).optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      const result = await runBountyScan({
        programId: parsed.data.programId,
        target: parsed.data.target,
        checks: parsed.data.checks as never,
      });
      if (!result.ok) {
        return NextResponse.json(result, { status: 403 });
      }
      return NextResponse.json({
        ...result,
        findings: listFindings(parsed.data.programId, 200),
        assets: listProgramAssets(parsed.data.programId),
      });
    }

    if (action === "discover") {
      const parsed = z
        .object({
          programId: z.string(),
          maxHosts: z.number().optional(),
          probeLive: z.boolean().optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      const result = await discoverProgramSites(parsed.data);
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "scan.all") {
      const parsed = z
        .object({
          programId: z.string(),
          rediscover: z.boolean().optional(),
          onlyLive: z.boolean().optional(),
          maxSites: z.number().optional(),
          checks: z.array(z.string()).optional(),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      const result = await runDynamicScanAll({
        programId: parsed.data.programId,
        rediscover: parsed.data.rediscover ?? true,
        onlyLive: parsed.data.onlyLive,
        maxSites: parsed.data.maxSites,
        checks: parsed.data.checks,
      });
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json({
        ...result,
        findings: listFindings(parsed.data.programId, 200),
      });
    }

    if (action === "finding.status") {
      const parsed = z
        .object({
          findingId: z.string(),
          status: z.enum([
            "new",
            "triaged",
            "accepted",
            "restoring",
            "restored",
            "verified",
            "duplicate",
            "out_of_scope",
            "closed",
          ]),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      const f = getFinding(parsed.data.findingId);
      if (!f) return NextResponse.json({ error: "not found" }, { status: 404 });
      f.status = parsed.data.status;
      if (
        parsed.data.status === "closed" ||
        parsed.data.status === "verified"
      ) {
        f.closedAt = new Date().toISOString();
      }
      saveFinding(f);
      return NextResponse.json({ finding: f });
    }

    if (action === "restore.create") {
      const r = await createRestoreJob(String(body.findingId || ""));
      if (!r.ok) return NextResponse.json(r, { status: 400 });
      return NextResponse.json(r);
    }

    if (action === "restore.step") {
      const r = await advanceRestoreStep({
        jobId: String(body.jobId || ""),
        stepId: String(body.stepId || ""),
        status: body.status,
        note: body.note,
      });
      if (!r.ok) return NextResponse.json(r, { status: 400 });
      return NextResponse.json(r);
    }

    if (action === "restore.probe") {
      const r = await runRestoreHealthProbe(String(body.jobId || ""));
      if (!r.ok) return NextResponse.json(r, { status: 400 });
      return NextResponse.json(r);
    }

    if (action === "restore.complete") {
      const r = await completeRestore(String(body.jobId || ""));
      if (!r.ok) return NextResponse.json(r, { status: 400 });
      return NextResponse.json(r);
    }

    return NextResponse.json(
      {
        error: "unknown action",
        allowed: [
          "program.create",
          "scan",
          "discover",
          "scan.all",
          "finding.status",
          "restore.create",
          "restore.step",
          "restore.probe",
          "restore.complete",
        ],
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bounty failed" },
      { status: 500 }
    );
  }
}
