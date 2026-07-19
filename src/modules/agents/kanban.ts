/**
 * SOTA Hermes-style Kanban for HelixaraAI agent teams.
 * Columns: triage → todo → ready → in_progress → blocked → done → archived
 * Parent/child handoff, profiles, skills, comments, Telegram notify.
 *
 * AUTHORIZED DEFENSIVE USE ONLY — no phishing, SMS spoof, or covert tracking.
 */

import { emitEvent } from "@/modules/events/bus";
import { completeLLM, LLMProviderId } from "@/modules/llm/providers";
import { scrapeUrl } from "@/lib/crawl/engine";
import { runOsint } from "@/lib/osint/collectors";
import { demoOperator } from "@/lib/ethics/guardrails";
import { uid } from "@/lib/utils";
import { recordTelemetryFromTask } from "@/modules/telemetry/entries";

export type KanbanColumn =
  | "triage"
  | "todo"
  | "ready"
  | "in_progress"
  | "blocked"
  | "done"
  | "archived";

export type TaskKind =
  | "research"
  | "osint"
  | "scrape"
  | "report"
  | "plan"
  | "custom";

export interface KanbanComment {
  id: string;
  ts: string;
  author: string;
  body: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  prompt: string;
  description: string;
  kind: TaskKind;
  column: KanbanColumn;
  parentId?: string;
  childrenIds: string[];
  profile: string;
  skills: string[];
  telegramNotify: boolean;
  comments: KanbanComment[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  blockedReason?: string;
  result?: string;
  artifacts?: unknown;
  error?: string;
  shortId: string;
}

export const PROFILES = [
  "default",
  "recon",
  "analyst",
  "scribe",
  "commander",
] as const;

const tasks = new Map<string, KanbanTask>();

const PROHIBITED =
  /\b(spoof\s*sms|sms\s*spoof|phishing|credential\s*harvest|track(ing)?\s*(device|phone|target)|fake\s*dhl|impersonat|smishing|sender\s*id\s*spoof|alphanumeric\s*sender)\b/i;

function touch(t: KanbanTask) {
  t.updatedAt = new Date().toISOString();
  tasks.set(t.id, t);
  return t;
}

function shortCode() {
  return uid("t").replace(/^t_/, "").slice(0, 8).toUpperCase();
}

export function listKanbanTasks(opts?: {
  includeArchived?: boolean;
  profile?: string;
  q?: string;
}): KanbanTask[] {
  let all = Array.from(tasks.values());
  if (!opts?.includeArchived) {
    all = all.filter((t) => t.column !== "archived");
  }
  if (opts?.profile && opts.profile !== "all") {
    all = all.filter((t) => t.profile === opts.profile);
  }
  if (opts?.q) {
    const q = opts.q.toLowerCase();
    all = all.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.prompt.toLowerCase().includes(q) ||
        t.shortId.toLowerCase().includes(q)
    );
  }
  return all.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export function getTask(id: string) {
  return tasks.get(id);
}

export function getKanbanBoard(opts?: {
  includeArchived?: boolean;
  profile?: string;
  q?: string;
}) {
  const all = listKanbanTasks(opts);
  const columns: Record<KanbanColumn, KanbanTask[]> = {
    triage: [],
    todo: [],
    ready: [],
    in_progress: [],
    blocked: [],
    done: [],
    archived: [],
  };
  for (const t of all) columns[t.column].push(t);
  return {
    columns,
    total: all.length,
    profiles: [...PROFILES],
    policy:
      "Authorized defensive tasks only. Prohibited: SMS spoofing, phishing pages, covert location tracking of third parties.",
  };
}

export function createKanbanTask(input: {
  title: string;
  prompt: string;
  description?: string;
  kind?: TaskKind;
  parentId?: string;
  profile?: string;
  skills?: string[];
  telegramNotify?: boolean;
  /** initial column when no parent */
  column?: KanbanColumn;
  autoReady?: boolean;
}): KanbanTask | { error: string } {
  const blob = `${input.title}\n${input.prompt}\n${input.description || ""}`;
  if (PROHIBITED.test(blob)) {
    emitEvent({
      type: "agent.task",
      source: "kanban",
      severity: "critical",
      title: "Task rejected by ethics gate",
      payload: { title: input.title.slice(0, 120) },
    });
    return {
      error:
        "Rejected: prohibited offensive patterns (SMS spoof / phishing / covert tracking). Use authorized OSINT, scrape under ROE, recon reports only.",
    };
  }

  const now = new Date().toISOString();
  let column: KanbanColumn =
    input.column ||
    (input.parentId ? "todo" : input.autoReady === false ? "triage" : "ready");

  const task: KanbanTask = {
    id: uid("kb"),
    shortId: shortCode(),
    title: input.title,
    prompt: input.prompt,
    description: input.description || "",
    kind: input.kind || inferKind(input.prompt),
    column,
    parentId: input.parentId,
    childrenIds: [],
    profile: input.profile || "default",
    skills: input.skills || [],
    telegramNotify: Boolean(input.telegramNotify),
    comments: [],
    createdAt: now,
    updatedAt: now,
  };

  if (input.parentId) {
    const parent = tasks.get(input.parentId);
    if (parent) {
      parent.childrenIds.push(task.id);
      task.column = parent.column === "done" ? "ready" : "todo";
      touch(parent);
    }
  }

  tasks.set(task.id, task);
  emitEvent({
    type: "agent.task",
    source: "kanban",
    severity: "info",
    title: `Kanban · ${task.shortId} created · ${task.column}`,
    payload: { id: task.id, column: task.column, kind: task.kind },
  });
  return task;
}

function inferKind(prompt: string): TaskKind {
  const p = prompt.toLowerCase();
  if (p.includes("osint") || p.includes("dns") || p.includes("enrich"))
    return "osint";
  if (p.includes("scrape") || p.includes("crawl")) return "scrape";
  if (p.includes("research") || p.includes("find")) return "research";
  if (p.includes("report") || p.includes("summary")) return "report";
  if (p.includes("plan")) return "plan";
  return "custom";
}

export function updateKanbanTask(
  id: string,
  patch: Partial<
    Pick<
      KanbanTask,
      | "column"
      | "telegramNotify"
      | "blockedReason"
      | "title"
      | "description"
      | "profile"
      | "skills"
      | "parentId"
    >
  >
): KanbanTask | null {
  const t = tasks.get(id);
  if (!t) return null;

  if (patch.parentId && patch.parentId !== t.parentId) {
    // detach old
    if (t.parentId) {
      const old = tasks.get(t.parentId);
      if (old) {
        old.childrenIds = old.childrenIds.filter((c) => c !== t.id);
        touch(old);
      }
    }
    if (patch.parentId) {
      const p = tasks.get(patch.parentId);
      if (p && !p.childrenIds.includes(t.id)) {
        p.childrenIds.push(t.id);
        touch(p);
      }
    }
  }

  Object.assign(t, patch);
  return touch(t);
}

export type TaskAction =
  | "triage"
  | "ready"
  | "block"
  | "unblock"
  | "complete"
  | "archive"
  | "todo";

export function applyTaskAction(
  id: string,
  action: TaskAction,
  extra?: { reason?: string }
): KanbanTask | null {
  const t = tasks.get(id);
  if (!t) return null;

  switch (action) {
    case "triage":
      t.column = "triage";
      t.blockedReason = undefined;
      break;
    case "todo":
      t.column = "todo";
      break;
    case "ready":
      t.column = "ready";
      t.blockedReason = undefined;
      break;
    case "block":
      t.column = "blocked";
      t.blockedReason = extra?.reason || "Blocked — needs human input";
      break;
    case "unblock":
      t.column = "ready";
      t.blockedReason = undefined;
      break;
    case "complete":
      t.column = "done";
      t.finishedAt = new Date().toISOString();
      t.blockedReason = undefined;
      promoteChildren(t);
      break;
    case "archive":
      t.column = "archived";
      break;
  }

  touch(t);
  emitEvent({
    type: "agent.task",
    source: "kanban",
    severity: "info",
    title: `Kanban · ${t.shortId} → ${action} (${t.column})`,
    payload: { id: t.id, action },
  });
  return t;
}

export function addComment(
  id: string,
  body: string,
  author = "operator"
): KanbanTask | null {
  const t = tasks.get(id);
  if (!t || !body.trim()) return null;
  t.comments.push({
    id: uid("cmt"),
    ts: new Date().toISOString(),
    author,
    body: body.trim().slice(0, 2000),
  });
  return touch(t);
}

function promoteChildren(parent: KanbanTask) {
  for (const cid of parent.childrenIds) {
    const child = tasks.get(cid);
    if (child && (child.column === "todo" || child.column === "triage")) {
      child.column = "ready";
      touch(child);
      emitEvent({
        type: "agent.task",
        source: "kanban",
        severity: "info",
        title: `Child ready · ${child.shortId} after ${parent.shortId}`,
        payload: { parentId: parent.id, childId: child.id },
      });
      if (child.telegramNotify) {
        void notifyTelegram(
          `🟢 HelixaraAI ${child.shortId} ready (parent ${parent.shortId} done)\n${child.title}`
        );
      }
    }
  }
}

export async function runReadyKanban(opts?: {
  provider?: LLMProviderId | "auto";
  limit?: number;
}): Promise<KanbanTask[]> {
  const ready = listKanbanTasks()
    .filter((t) => t.column === "ready")
    .slice(0, opts?.limit ?? 4);

  const results = await Promise.all(
    ready.map((t) => executeTask(t, opts?.provider))
  );
  const newlyReady = listKanbanTasks().filter((t) => t.column === "ready");
  if (newlyReady.length) {
    const more = await Promise.all(
      newlyReady.slice(0, 3).map((t) => executeTask(t, opts?.provider))
    );
    results.push(...more);
  }
  return results;
}

/** Nudge: pick ready tasks into workers (alias run) */
export async function nudgeDispatcher(limit = 4) {
  return runReadyKanban({ limit, provider: "auto" });
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
    title: `In progress · ${task.shortId}`,
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
      task.result =
        `OSINT ${report.status}: ${report.findings.length} findings\n` +
        report.findings.map((f) => `- [${f.source}] ${f.title}`).join("\n");
      task.artifacts = report.findings.slice(0, 20);
      recordTelemetryFromTask(task, {
        label: `OSINT ${q}`,
        kind: "osint",
      });
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
        if (task.telegramNotify) {
          await notifyTelegram(
            `⚠️ ${task.shortId} blocked: ${task.blockedReason}`
          );
        }
        return task;
      }
      recordTelemetryFromTask(task, {
        label: r.page?.title || url,
        kind: "scrape",
      });
    } else {
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
              `Skills: ${task.skills.join(", ") || "none"}`,
              `Prompt: ${task.prompt}`,
              task.description ? `Description: ${task.description}` : "",
              parentResult
                ? `Parent handoff result:\n${parentResult.slice(0, 4000)}`
                : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      });
      task.result = llm.content;
      task.artifacts = { provider: llm.provider, model: llm.model };
      recordTelemetryFromTask(task, {
        label: task.title,
        kind: "agent",
      });
    }

    task.column = "done";
    task.finishedAt = new Date().toISOString();
    touch(task);
    promoteChildren(task);

    emitEvent({
      type: "agent.task",
      source: "kanban",
      severity: "info",
      title: `Done · ${task.shortId}`,
      payload: { id: task.id, telegramNotify: task.telegramNotify },
    });

    if (task.telegramNotify) {
      await notifyTelegram(
        `✅ HelixaraAI ${task.shortId} done — ${task.title}\n${(task.result || "").slice(0, 500)}`
      );
    }
  } catch (e) {
    task.column = "blocked";
    task.blockedReason = e instanceof Error ? e.message : "execution failed";
    task.error = task.blockedReason;
    touch(task);
    if (task.telegramNotify) {
      await notifyTelegram(
        `⚠️ HelixaraAI ${task.shortId} blocked: ${task.blockedReason}`
      );
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
    /* optional */
  }
}

export { notifyTelegram, PROHIBITED as KANBAN_PROHIBITED };
