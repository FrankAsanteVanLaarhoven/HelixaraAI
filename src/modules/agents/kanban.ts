/**
 * Hermes-inspired Kanban for HelixaraAI agent teams.
 * Columns: todo → ready → in_progress → blocked → done
 * Supports parent/child handoff and parallel ready tasks.
 *
 * AUTHORIZED DEFENSIVE USE ONLY — no phishing, SMS spoof, or covert tracking skills.
 */

import { emitEvent } from "@/modules/events/bus";
import { completeLLM, LLMProviderId } from "@/modules/llm/providers";
import { scrapeUrl } from "@/lib/crawl/engine";
import { runOsint } from "@/lib/osint/collectors";
import { demoOperator } from "@/lib/ethics/guardrails";
import { uid } from "@/lib/utils";

export type KanbanColumn =
  | "todo"
  | "ready"
  | "in_progress"
  | "blocked"
  | "done";

export type TaskKind =
  | "research"
  | "osint"
  | "scrape"
  | "report"
  | "plan"
  | "custom";

export interface KanbanTask {
  id: string;
  title: string;
  prompt: string;
  kind: TaskKind;
  column: KanbanColumn;
  parentId?: string;
  childrenIds: string[];
  profile: string;
  telegramNotify: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  blockedReason?: string;
  result?: string;
  artifacts?: unknown;
  error?: string;
}

const tasks = new Map<string, KanbanTask>();
const PROHIBITED =
  /\b(spoof\s*sms|sms\s*spoof|phishing|credential\s*harvest|track(ing)?\s*(device|phone|target)|fake\s*dhl|impersonat|smishing|sender\s*id\s*spoof)\b/i;

function touch(t: KanbanTask) {
  t.updatedAt = new Date().toISOString();
  tasks.set(t.id, t);
  return t;
}

export function listKanbanTasks(): KanbanTask[] {
  return Array.from(tasks.values()).sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function getKanbanBoard() {
  const all = listKanbanTasks();
  const columns: Record<KanbanColumn, KanbanTask[]> = {
    todo: [],
    ready: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  for (const t of all) columns[t.column].push(t);
  return {
    columns,
    total: all.length,
    policy:
      "Authorized defensive tasks only. Prohibited: SMS spoofing, phishing pages, covert location tracking of third parties.",
  };
}

export function createKanbanTask(input: {
  title: string;
  prompt: string;
  kind?: TaskKind;
  parentId?: string;
  profile?: string;
  telegramNotify?: boolean;
  autoReady?: boolean;
}): KanbanTask | { error: string } {
  if (PROHIBITED.test(input.title) || PROHIBITED.test(input.prompt)) {
    emitEvent({
      type: "agent.task",
      source: "kanban",
      severity: "critical",
      title: "Task rejected by ethics gate",
      payload: { title: input.title.slice(0, 120) },
    });
    return {
      error:
        "Rejected: task matches prohibited offensive patterns (SMS spoof / phishing / covert tracking). Use authorized OSINT, scrape under ROE, recon reports only.",
    };
  }

  const now = new Date().toISOString();
  const task: KanbanTask = {
    id: uid("kb"),
    title: input.title,
    prompt: input.prompt,
    kind: input.kind || inferKind(input.prompt),
    column: input.parentId ? "todo" : input.autoReady === false ? "todo" : "ready",
    parentId: input.parentId,
    childrenIds: [],
    profile: input.profile || "default",
    telegramNotify: Boolean(input.telegramNotify),
    createdAt: now,
    updatedAt: now,
  };

  if (input.parentId) {
    const parent = tasks.get(input.parentId);
    if (parent) {
      parent.childrenIds.push(task.id);
      // child waits until parent done
      if (parent.column !== "done") task.column = "todo";
      else task.column = "ready";
      touch(parent);
    }
  }

  tasks.set(task.id, task);
  emitEvent({
    type: "agent.task",
    source: "kanban",
    severity: "info",
    title: `Kanban task created · ${task.title}`,
    payload: { id: task.id, column: task.column, kind: task.kind },
  });
  return task;
}

function inferKind(prompt: string): TaskKind {
  const p = prompt.toLowerCase();
  if (p.includes("osint") || p.includes("dns") || p.includes("enrich")) return "osint";
  if (p.includes("scrape") || p.includes("crawl")) return "scrape";
  if (p.includes("research") || p.includes("find")) return "research";
  if (p.includes("report") || p.includes("summary")) return "report";
  if (p.includes("plan")) return "plan";
  return "custom";
}

export function updateKanbanTask(
  id: string,
  patch: Partial<Pick<KanbanTask, "column" | "telegramNotify" | "blockedReason" | "title">>
): KanbanTask | null {
  const t = tasks.get(id);
  if (!t) return null;
  Object.assign(t, patch);
  return touch(t);
}

function promoteChildren(parent: KanbanTask) {
  for (const cid of parent.childrenIds) {
    const child = tasks.get(cid);
    if (child && child.column === "todo") {
      child.column = "ready";
      touch(child);
      emitEvent({
        type: "agent.task",
        source: "kanban",
        severity: "info",
        title: `Child ready after parent · ${child.title}`,
        payload: { parentId: parent.id, childId: child.id },
      });
    }
  }
}

/** Run all ready tasks (parallel where independent) */
export async function runReadyKanban(opts?: {
  provider?: LLMProviderId | "auto";
  limit?: number;
}): Promise<KanbanTask[]> {
  const ready = listKanbanTasks()
    .filter((t) => t.column === "ready")
    .slice(0, opts?.limit ?? 4);

  const results = await Promise.all(ready.map((t) => executeTask(t, opts?.provider)));
  // After parents finish, newly ready children may exist — one cascade pass
  const newlyReady = listKanbanTasks().filter((t) => t.column === "ready");
  if (newlyReady.length) {
    const more = await Promise.all(
      newlyReady.slice(0, 3).map((t) => executeTask(t, opts?.provider))
    );
    results.push(...more);
  }
  return results;
}

async function executeTask(
  task: KanbanTask,
  provider?: LLMProviderId | "auto"
): Promise<KanbanTask> {
  task.column = "in_progress";
  task.startedAt = new Date().toISOString();
  touch(task);

  emitEvent({
    type: "agent.task",
    source: "kanban",
    severity: "info",
    title: `In progress · ${task.title}`,
    payload: { id: task.id, kind: task.kind },
  });

  const ctx = demoOperator();
  const parentResult = task.parentId
    ? tasks.get(task.parentId)?.result
    : undefined;

  try {
    if (task.kind === "osint") {
      const q =
        task.prompt.match(/\b([a-z0-9.-]+\.[a-z]{2,})\b/i)?.[1] ||
        task.prompt.slice(0, 80);
      const report = await runOsint(q, ctx);
      task.result = `OSINT ${report.status}: ${report.findings.length} findings\n` +
        report.findings.map((f) => `- [${f.source}] ${f.title}`).join("\n");
      task.artifacts = report.findings.slice(0, 20);
    } else if (task.kind === "scrape") {
      const urlMatch = task.prompt.match(/https?:\/\/\S+/i);
      const host = task.prompt.match(/\b([a-z0-9.-]+\.[a-z]{2,})\b/i)?.[1];
      const url = urlMatch?.[0] || (host ? `https://${host}` : "");
      if (!url) {
        task.column = "blocked";
        task.blockedReason = "No URL/domain found in prompt for scrape";
        touch(task);
        return task;
      }
      const r = await scrapeUrl(
        { url, tier: "elevated", deep: false, respectRobots: true },
        ctx
      );
      task.result =
        r.status === "ok"
          ? `Scrape OK · ${r.page?.title} · words ${r.page?.stats.wordCount}`
          : `Scrape ${r.status}: ${r.error}`;
      task.artifacts = {
        status: r.status,
        title: r.page?.title,
        technologies: r.page?.structured.technologies,
      };
      if (r.status === "blocked") {
        task.column = "blocked";
        task.blockedReason = r.error;
        touch(task);
        return task;
      }
    } else {
      // research / plan / report / custom via LLM
      const llm = await completeLLM({
        provider: provider === "auto" ? undefined : provider,
        purpose: "agent_plan",
        messages: [
          {
            role: "system",
            content:
              "You are a HelixaraAI Kanban agent for AUTHORIZED defensive security only. Refuse phishing, SMS spoofing, covert tracking. Produce actionable, legal research or plans. If parent results are provided, build on them.",
          },
          {
            role: "user",
            content: [
              `Task: ${task.title}`,
              `Kind: ${task.kind}`,
              `Prompt: ${task.prompt}`,
              parentResult ? `Parent handoff result:\n${parentResult.slice(0, 4000)}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      });
      task.result = llm.content;
      task.artifacts = { provider: llm.provider, model: llm.model };
    }

    task.column = "done";
    task.finishedAt = new Date().toISOString();
    touch(task);
    promoteChildren(task);

    emitEvent({
      type: "agent.task",
      source: "kanban",
      severity: "info",
      title: `Done · ${task.title}`,
      payload: { id: task.id, telegramNotify: task.telegramNotify },
    });

    if (task.telegramNotify) {
      await notifyTelegram(`✅ HelixaraAI task done: ${task.title}\n${(task.result || "").slice(0, 500)}`);
    }
  } catch (e) {
    task.column = "blocked";
    task.blockedReason = e instanceof Error ? e.message : "execution failed";
    task.error = task.blockedReason;
    touch(task);
    emitEvent({
      type: "agent.task",
      source: "kanban",
      severity: "warn",
      title: `Blocked · ${task.title}`,
      payload: { reason: task.blockedReason },
    });
    if (task.telegramNotify) {
      await notifyTelegram(`⚠️ HelixaraAI task blocked: ${task.title}\n${task.blockedReason}`);
    }
  }

  return task;
}

async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_USER_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 3500),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    /* optional channel */
  }
}

export { notifyTelegram, PROHIBITED as KANBAN_PROHIBITED };
