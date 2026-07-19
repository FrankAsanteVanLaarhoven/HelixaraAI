import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAndRunMission,
  listMissions,
  getMission,
} from "@/lib/agents/orchestrator";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  objective: z.string().min(4).max(2000),
  target: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const m = getMission(id);
    if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(m);
  }
  return NextResponse.json({ missions: listMissions() });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const mission = await createAndRunMission(parsed.data, demoOperator());
    return NextResponse.json(mission, {
      status: mission.status === "blocked" ? 403 : 200,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "mission failed" },
      { status: 500 }
    );
  }
}
