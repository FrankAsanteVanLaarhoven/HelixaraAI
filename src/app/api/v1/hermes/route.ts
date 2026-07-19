import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listHermesRuns, runHermesSwarm } from "@/modules/agents/hermes";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  objective: z.string().min(4).max(2000),
  target: z.string().max(500).optional(),
  provider: z
    .enum(["auto", "ollama-llama31", "openai-chatgpt", "hermes-router", "openrouter", "openclaw"])
    .optional(),
  useOpenClaw: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ runs: listHermesRuns() });
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
    const run = await runHermesSwarm(parsed.data);
    return NextResponse.json(run);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "hermes failed" },
      { status: 500 }
    );
  }
}
