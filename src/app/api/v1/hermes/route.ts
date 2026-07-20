import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listHermesRuns, runHermesSwarm } from "@/modules/agents/hermes";
import {
  getHermesNativeStatus,
  listFreeModels,
  runHermesNative,
} from "@/modules/agents/hermesNative";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  objective: z.string().min(4).max(2000),
  target: z.string().max(500).optional(),
  provider: z
    .enum([
      "auto",
      "ollama-llama31",
      "openai-chatgpt",
      "hermes-router",
      "hermes-native",
      "openrouter",
      "openclaw",
    ])
    .optional(),
  useOpenClaw: z.boolean().optional(),
  freeModel: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const native = await getHermesNativeStatus();
  const freeModels = await listFreeModels();
  return NextResponse.json({
    runs: listHermesRuns(),
    native,
    freeModels,
    defaultProvider: "hermes-native",
    defaultModel: process.env.HERMES_FREE_MODEL || "free",
  });
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
    if (parsed.data.freeModel) {
      process.env.HERMES_FREE_MODEL = parsed.data.freeModel;
    }
    // Optional direct free-model pass without full swarm
    if (req.nextUrl.searchParams.get("mode") === "native") {
      const native = await runHermesNative({
        prompt: `${parsed.data.name}\n${parsed.data.objective}\nTarget: ${parsed.data.target || "n/a"}`,
        model: parsed.data.freeModel || process.env.HERMES_FREE_MODEL || "free",
      });
      return NextResponse.json({ mode: "native", ...native });
    }
    const run = await runHermesSwarm({
      ...parsed.data,
      provider: parsed.data.provider || "hermes-native",
    });
    return NextResponse.json(run);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "hermes failed" },
      { status: 500 }
    );
  }
}
