import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addComment,
  applyTaskAction,
  createKanbanTask,
  getKanbanBoard,
  getTask,
  listKanbanTasks,
  nudgeDispatcher,
  runReadyKanban,
  updateKanbanTask,
} from "@/modules/agents/kanban";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(2).max(200),
  prompt: z.string().min(2).max(4000),
  description: z.string().max(4000).optional(),
  kind: z
    .enum(["research", "osint", "scrape", "report", "plan", "custom"])
    .optional(),
  parentId: z.string().optional(),
  profile: z.string().optional(),
  skills: z.array(z.string()).optional(),
  telegramNotify: z.boolean().optional(),
  autoReady: z.boolean().optional(),
  column: z
    .enum([
      "triage",
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "done",
      "archived",
    ])
    .optional(),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const includeArchived = sp.get("archived") === "1";
  const profile = sp.get("profile") || undefined;
  const q = sp.get("q") || undefined;
  const id = sp.get("id");
  if (id) {
    const t = getTask(id);
    if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ task: t });
  }
  return NextResponse.json({
    board: getKanbanBoard({ includeArchived, profile, q }),
    tasks: listKanbanTasks({ includeArchived, profile, q }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const action = json.action as string | undefined;

    if (action === "run" || action === "nudge") {
      const done =
        action === "nudge"
          ? await nudgeDispatcher(json.limit ?? 4)
          : await runReadyKanban({
              provider: json.provider || "auto",
              limit: json.limit ?? 4,
            });
      return NextResponse.json({ ran: done, board: getKanbanBoard() });
    }

    if (action === "move") {
      const t = updateKanbanTask(json.id, { column: json.column });
      if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ task: t, board: getKanbanBoard() });
    }

    if (action === "action") {
      const t = applyTaskAction(json.id, json.taskAction, {
        reason: json.reason,
      });
      if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ task: t, board: getKanbanBoard() });
    }

    if (action === "comment") {
      const t = addComment(json.id, json.body || "", json.author || "operator");
      if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ task: t });
    }

    if (action === "update") {
      const t = updateKanbanTask(json.id, {
        title: json.title,
        description: json.description,
        telegramNotify: json.telegramNotify,
        profile: json.profile,
        skills: json.skills,
        parentId: json.parentId,
      });
      if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ task: t, board: getKanbanBoard() });
    }

    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const created = createKanbanTask(parsed.data);
    if ("error" in created) {
      return NextResponse.json(created, { status: 403 });
    }
    return NextResponse.json({ task: created, board: getKanbanBoard() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "kanban failed" },
      { status: 500 }
    );
  }
}
