import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeLLM } from "@/modules/llm/providers";
import { getPrivacyMode } from "@/modules/os/privacy";
import { getOsState } from "@/modules/os/memory";
import { emitEvent } from "@/modules/events/bus";
import { addNote } from "@/modules/os/memory";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  provider: z
    .enum([
      "auto",
      "ollama-llama31",
      "openai-chatgpt",
      "openrouter",
      "hermes-router",
      "openclaw",
    ])
    .optional(),
  model: z.string().optional(),
  personaId: z.string().optional(),
  remember: z.boolean().optional(),
});

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

    const mode = getPrivacyMode();
    const state = await getOsState();
    const persona = parsed.data.personaId
      ? state.personas.find((p) => p.id === parsed.data.personaId)
      : state.personas[0];

    const system = [
      persona?.systemPrompt ||
        "You are HelixaraAI, a sovereign local-first security operations assistant.",
      "Authorized defensive use only. No malware, phishing, SMS spoof, or covert tracking help.",
      `Privacy mode: ${mode}. In vault mode you must assume all context stays local.`,
      persona ? `Active persona: ${persona.name} (${persona.role})` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await completeLLM({
      provider:
        parsed.data.provider === "auto" ? undefined : parsed.data.provider,
      model: parsed.data.model,
      purpose: "inference",
      messages: [
        { role: "system", content: system },
        { role: "user", content: parsed.data.message },
      ],
    });

    if (parsed.data.remember) {
      await addNote({
        title: `Chat · ${parsed.data.message.slice(0, 60)}`,
        body: `Q: ${parsed.data.message}\n\nA: ${result.content.slice(0, 2000)}`,
        tags: ["chat", mode],
        vault: mode === "vault",
      });
    }

    emitEvent({
      type: "llm.completion",
      source: "os.chat",
      severity: "info",
      title: `OS chat · ${result.provider} · mode ${mode}`,
      payload: { privacyMode: mode, persona: persona?.name },
    });

    return NextResponse.json({
      ...result,
      privacyMode: mode,
      persona: persona
        ? { id: persona.id, name: persona.name, role: persona.role }
        : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "chat failed" },
      { status: 500 }
    );
  }
}
