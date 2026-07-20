import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  exportWorldviewJsonl,
  getEpisode,
  getWorldviewModel,
  ingestVideoEpisode,
  labelEpisode,
  listEpisodes,
  loadWorldview,
  narrateEpisode,
  rolloutEpisode,
  trainWorldviewModel,
  worldviewStats,
} from "@/modules/worldview/model";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await loadWorldview();
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const ep = getEpisode(id);
    if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });
    const rollout = rolloutEpisode(id, 2);
    return NextResponse.json({ episode: ep, rollout: rollout?.slice(0, 40) });
  }
  return NextResponse.json({
    stats: worldviewStats(),
    model: getWorldviewModel(),
    episodes: listEpisodes(40),
    pillars: {
      video: true,
      physics: true,
      worldState: true,
      trainExport: true,
    },
  });
}

const ingestSchema = z.object({
  action: z.literal("ingest"),
  title: z.string().min(2).max(200),
  source: z.string().min(1).max(2000),
  durationSec: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fps: z.number().optional(),
  luminanceSamples: z.array(z.number()).optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const json = await req.json();
    const action = json.action as string;

    if (action === "ingest") {
      const parsed = ingestSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const ep = await ingestVideoEpisode(parsed.data);
      await appendAudit({
        operatorId: operator.operatorId,
        action: "worldview.ingest",
        allowed: true,
        risk: "low",
        severity: "info",
        engagementId: operator.engagementId,
        details: { id: ep.id, source: parsed.data.source },
      });
      return NextResponse.json({ episode: ep, stats: worldviewStats() });
    }

    if (action === "narrate") {
      const id = String(json.episodeId || "");
      const ep = await narrateEpisode(id);
      if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ episode: ep });
    }

    if (action === "label") {
      const ep = await labelEpisode(
        String(json.episodeId),
        json.quality,
        json.note
      );
      if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ episode: ep });
    }

    if (action === "rollout") {
      const rollout = rolloutEpisode(String(json.episodeId), Number(json.seconds) || 2);
      if (!rollout) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ rollout });
    }

    if (action === "train") {
      const model = await trainWorldviewModel();
      await appendAudit({
        operatorId: operator.operatorId,
        action: "worldview.train",
        allowed: true,
        risk: "low",
        severity: "info",
        details: { version: model.version, episodeCount: model.episodeCount },
      });
      return NextResponse.json({ model, stats: worldviewStats() });
    }

    if (action === "export") {
      const exp = await exportWorldviewJsonl();
      return NextResponse.json(exp);
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "worldview failed" },
      { status: 500 }
    );
  }
}
