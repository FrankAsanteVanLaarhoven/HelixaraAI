import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  completeLLM,
  listTrainingSamples,
  probeProviders,
} from "@/modules/llm/providers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z
    .enum(["ollama-llama31", "openai-chatgpt", "hermes-router", "openclaw"])
    .optional(),
  model: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1),
  purpose: z
    .enum(["inference", "training_sample", "agent_plan", "report"])
    .optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function GET() {
  const providers = await probeProviders();
  return NextResponse.json({
    providers,
    trainingSamples: listTrainingSamples(20),
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
    const result = await completeLLM(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "llm failed" },
      { status: 500 }
    );
  }
}
