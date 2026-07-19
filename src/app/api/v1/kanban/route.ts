import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createKanbanTask,
  getKanbanBoard,
  listKanbanTasks,
  runReadyKanban,
  updateKanbanTask,
} from "@/modules/agents/kanban";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(2).max(200),
  prompt: z.string().min(2).max(4000),
  kind: z
    .enum(["research", "osint", "scrape", "report", "plan", "custom"])
    .optional(),
  parentId: z.string().optional(),
  profile: z.string().optional(),
  telegramNotify: z.boolean().optional(),
  autoReady: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({
    board: getKanbanBoard(),
    tasks: listKanbanTasks(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const action = json.action as string | undefined;

    if (action === "run") {
      const done = await runReadyKanban({
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
