import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getPrivacyMode,
  privacyPolicy,
  setPrivacyMode,
  type PrivacyMode,
} from "@/modules/os/privacy";
import {
  addDoc,
  addNote,
  getOsState,
  refreshSuggestions,
  upsertGoal,
  upsertPersona,
  upsertSkill,
} from "@/modules/os/memory";
import { getOllamaHub } from "@/modules/os/ollama";
import { probeProviders } from "@/modules/llm/providers";
import { eventStats } from "@/modules/events/bus";
import { getKanbanBoard } from "@/modules/agents/kanban";

export const dynamic = "force-dynamic";

export async function GET() {
  const [state, ollama, providers, suggestions] = await Promise.all([
    getOsState(),
    getOllamaHub(),
    probeProviders(),
    refreshSuggestions(),
  ]);
  return NextResponse.json({
    name: "Helixara OS",
    tagline: "One home for local intelligence · vault or connected",
    privacy: privacyPolicy(),
    mode: getPrivacyMode(),
    memory: state,
    suggestions,
    ollama,
    connections: providers,
    events: eventStats(),
    kanban: { total: getKanbanBoard().total },
    ownership: {
      dataPath: "data/os/state.json",
      auditPath: "data/audit.ndjson",
      localModels: "Ollama on your machine",
      neverLeavesVault: getPrivacyMode() === "vault",
    },
  });
}

const postSchema = z.object({
  action: z.enum([
    "set_mode",
    "add_note",
    "upsert_goal",
    "upsert_persona",
    "upsert_skill",
    "add_doc",
  ]),
  mode: z.enum(["vault", "connected", "hybrid"]).optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  vault: z.boolean().optional(),
  id: z.string().optional(),
  status: z.enum(["active", "paused", "done"]).optional(),
  progress: z.number().optional(),
  notes: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  systemPrompt: z.string().optional(),
  skills: z.array(z.string()).optional(),
  description: z.string().optional(),
  kind: z.enum(["osint", "scrape", "report", "custom"]).optional(),
  prompt: z.string().optional(),
  path: z.string().optional(),
  summary: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    if (d.action === "set_mode") {
      if (!d.mode) {
        return NextResponse.json({ error: "mode required" }, { status: 400 });
      }
      const mode = setPrivacyMode(d.mode as PrivacyMode);
      return NextResponse.json({ mode, privacy: privacyPolicy() });
    }

    if (d.action === "add_note") {
      const note = await addNote({
        title: d.title || "Note",
        body: d.body || "",
        tags: d.tags,
        vault: d.vault,
      });
      return NextResponse.json({ note, state: await getOsState() });
    }

    if (d.action === "upsert_goal") {
      const goal = await upsertGoal({
        id: d.id,
        title: d.title || "Goal",
        status: d.status,
        progress: d.progress,
        notes: d.notes,
      });
      return NextResponse.json({ goal, state: await getOsState() });
    }

    if (d.action === "upsert_persona") {
      const persona = await upsertPersona({
        id: d.id,
        name: d.name || "Persona",
        role: d.role || "",
        systemPrompt: d.systemPrompt || "",
        skills: d.skills || [],
      });
      return NextResponse.json({ persona, state: await getOsState() });
    }

    if (d.action === "upsert_skill") {
      const skill = await upsertSkill({
        id: d.id,
        name: d.name || "Skill",
        description: d.description || "",
        kind: d.kind || "custom",
        prompt: d.prompt || "",
      });
      return NextResponse.json({ skill, state: await getOsState() });
    }

    if (d.action === "add_doc") {
      const doc = await addDoc({
        title: d.title || "Document",
        path: d.path || "",
        summary: d.summary,
      });
      return NextResponse.json({ doc, state: await getOsState() });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "os failed" },
      { status: 500 }
    );
  }
}
