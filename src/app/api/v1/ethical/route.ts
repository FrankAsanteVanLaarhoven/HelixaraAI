import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  acceptEthicalUsage,
  getEthicalUsageState,
  ETHICAL_USAGE_NOTICE,
} from "@/modules/ethical/usage";
import { addKitNote, listKits } from "@/modules/ethical/kits";
import {
  createAwarenessExercise,
  listAwareness,
} from "@/modules/ethical/awareness";
import { listRfSim, runRfSoftwareSim } from "@/modules/ethical/rfSim";
import {
  createCampaign,
  listAttackLibrary,
} from "@/modules/ethical/attack";
import {
  listPurpleBoard,
  movePurpleCard,
  upsertPurpleCard,
} from "@/modules/ethical/purple";
import { getWorkspace, listWorkspaces } from "@/modules/ethical/workspaces";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") || "usage";
  const side = req.nextUrl.searchParams.get("side") || "red";

  if (section === "usage") {
    return NextResponse.json(await getEthicalUsageState());
  }
  if (section === "kits") return NextResponse.json(await listKits());
  if (section === "awareness") return NextResponse.json(await listAwareness());
  if (section === "rf") return NextResponse.json(await listRfSim());
  if (section === "attack") return NextResponse.json(await listAttackLibrary());
  if (section === "purple") return NextResponse.json(await listPurpleBoard());
  if (section === "workspaces") return NextResponse.json(listWorkspaces());
  if (section === "workspace") {
    const id =
      side === "blue" || side === "purple" || side === "red" ? side : "red";
    return NextResponse.json(await getWorkspace(id));
  }
  return NextResponse.json({
    notice: ETHICAL_USAGE_NOTICE,
    sections: [
      "usage",
      "kits",
      "awareness",
      "rf",
      "attack",
      "purple",
      "workspaces",
      "workspace",
    ],
  });
}

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "accept_usage") {
      const parsed = z
        .object({
          operatorId: z.string().min(2),
          confirmText: z.string().min(5),
        })
        .safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
      const result = acceptEthicalUsage(parsed.data);
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      await appendAudit({
        operatorId: parsed.data.operatorId,
        action: "ethical.usage.accept",
        allowed: true,
        risk: "medium",
        severity: "info",
        details: { ethicalHackingOnly: true },
      });
      return NextResponse.json({ ...result, state: getEthicalUsageState() });
    }

    if (action === "kit.note") {
      const r = await addKitNote(String(body.kitId || ""), String(body.note || ""));
      if (!r.ok) return NextResponse.json(r, { status: 403 });
      return NextResponse.json(r);
    }

    if (action === "awareness.create") {
      const r = await createAwarenessExercise({
        templateId: String(body.templateId || ""),
        title: String(body.title || "Awareness exercise"),
        audienceNote: String(body.audienceNote || "Authorized internal staff"),
        engagementId: body.engagementId,
        liveSend: body.liveSend === true,
        spoofSender: body.spoofSender === true,
      });
      if (!r.ok) return NextResponse.json(r, { status: 403 });
      await appendAudit({
        operatorId: operator.operatorId,
        action: "ethical.awareness.sim",
        allowed: true,
        risk: body.liveSend || body.spoofSender ? "critical" : "low",
        severity: "info",
        engagementId: body.engagementId,
        details: {
          templateId: body.templateId,
          liveSend: Boolean(body.liveSend),
          spoofSender: Boolean(body.spoofSender),
        },
      });
      return NextResponse.json(r);
    }

    if (action === "rf.software_sim") {
      const r = await runRfSoftwareSim({
        engagementId: String(body.engagementId || ""),
        bssid: body.bssid,
        channel: body.channel,
        count: body.count,
        otaInject: body.otaInject === true,
      });
      if (!r.ok) return NextResponse.json(r, { status: 403 });
      await appendAudit({
        operatorId: operator.operatorId,
        action: "ethical.rf.software_sim",
        allowed: true,
        risk: r.otaAuthorized ? "critical" : "medium",
        severity: "info",
        engagementId: body.engagementId,
        details: {
          otaInject: Boolean(body.otaInject),
          otaAuthorized: Boolean(r.otaAuthorized),
          frames: r.job?.framesGenerated,
        },
      });
      return NextResponse.json(r);
    }

    if (action === "attack.campaign") {
      const r = await createCampaign({
        name: String(body.name || "Campaign"),
        engagementId: String(body.engagementId || ""),
        objective: String(body.objective || ""),
        techniqueIds: Array.isArray(body.techniqueIds)
          ? body.techniqueIds.map(String)
          : [],
        liveMode: body.liveMode === true,
      });
      if (!r.ok) return NextResponse.json(r, { status: 403 });
      await appendAudit({
        operatorId: operator.operatorId,
        action: "ethical.attack.campaign",
        allowed: true,
        risk: body.liveMode ? "critical" : "medium",
        severity: "info",
        engagementId: body.engagementId,
        details: {
          techniques: body.techniqueIds,
          liveMode: Boolean(body.liveMode),
        },
      });
      return NextResponse.json(r);
    }

    if (action === "purple.upsert") {
      const r = upsertPurpleCard({
        id: body.id,
        title: String(body.title || ""),
        detail: body.detail,
        column: body.column,
        engagementId: body.engagementId,
        techniqueIds: body.techniqueIds,
        redOwner: body.redOwner,
        blueOwner: body.blueOwner,
      });
      if (!r.ok) return NextResponse.json(r, { status: 403 });
      return NextResponse.json(r);
    }

    if (action === "purple.move") {
      const r = movePurpleCard(String(body.id || ""), body.column);
      if (!r.ok) return NextResponse.json(r, { status: 403 });
      return NextResponse.json(r);
    }

    return NextResponse.json(
      {
        error: "unknown action",
        allowed: [
          "accept_usage",
          "kit.note",
          "awareness.create",
          "rf.software_sim",
          "attack.campaign",
          "purple.upsert",
          "purple.move",
        ],
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ethical api failed" },
      { status: 500 }
    );
  }
}
