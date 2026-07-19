/**
 * Telegram operator channel for HelixaraAI (authorized control plane).
 * Inspired by Hermes mobile control — NOT a vector for SMS spoof / phishing ops.
 *
 * Security:
 * - Only TELEGRAM_ALLOWED_USER_ID can issue commands
 * - Prohibited intent classifier blocks social-engineering attacks
 * - All commands audited via event bus
 */

import { emitEvent } from "@/modules/events/bus";
import {
  createKanbanTask,
  getKanbanBoard,
  notifyTelegram,
  runReadyKanban,
  KANBAN_PROHIBITED,
} from "@/modules/agents/kanban";
import { runHermesSwarm } from "@/modules/agents/hermes";
import { runOsint } from "@/lib/osint/collectors";
import { demoOperator } from "@/lib/ethics/guardrails";
import { probeProviders } from "@/modules/llm/providers";

const ALLOWED = process.env.TELEGRAM_ALLOWED_USER_ID || "";

export function isAllowedTelegramUser(userId: string | number): boolean {
  if (!ALLOWED) return false;
  return String(userId) === String(ALLOWED);
}

export async function handleTelegramCommand(
  fromUserId: string | number,
  text: string
): Promise<string> {
  if (!isAllowedTelegramUser(fromUserId)) {
    emitEvent({
      type: "agent.task",
      source: "telegram",
      severity: "warn",
      title: "Telegram command rejected · unauthorized user",
      payload: { fromUserId: String(fromUserId) },
    });
    return "Unauthorized. HelixaraAI only accepts commands from the configured operator user ID.";
  }

  const msg = text.trim();
  if (KANBAN_PROHIBITED.test(msg)) {
    emitEvent({
      type: "agent.task",
      source: "telegram",
      severity: "critical",
      title: "Telegram command blocked · prohibited intent",
    });
    return (
      "Blocked by ethics gate. HelixaraAI will not assist with SMS spoofing, phishing, " +
      "or covert device tracking. Use authorized OSINT / recon under ROE only."
    );
  }

  const lower = msg.toLowerCase();

  if (lower === "/start" || lower === "/help") {
    return [
      "HelixaraAI operator bot (authorized use only)",
      "",
      "/status — providers & board",
      "/board — Kanban summary",
      "/osint <domain> — public OSINT",
      "/hermes <target> — run Hermes swarm",
      "/task <title> | <prompt> — create Kanban task",
      "/run — execute ready Kanban tasks",
      "",
      "Prohibited: SMS spoof, phishing pages, covert tracking.",
    ].join("\n");
  }

  if (lower === "/status") {
    const providers = await probeProviders();
    const board = getKanbanBoard();
    const lines = providers.map(
      (p) => `· ${p.id}: ${p.available ? "up" : "down"} (${p.defaultModel})`
    );
    return [
      "HelixaraAI status",
      ...lines,
      `Kanban tasks: ${board.total}`,
      board.policy,
    ].join("\n");
  }

  if (lower === "/board") {
    const board = getKanbanBoard();
    return (["Kanban"] as string[])
      .concat(
        (Object.keys(board.columns) as (keyof typeof board.columns)[]).map(
          (col) =>
            `${col}: ${board.columns[col].length} — ${board.columns[col]
              .map((t) => t.title)
              .slice(0, 3)
              .join("; ")}`
        )
      )
      .join("\n");
  }

  if (lower.startsWith("/osint ")) {
    const q = msg.slice(6).trim();
    const report = await runOsint(q, demoOperator());
    return `OSINT ${report.status}: ${report.findings.length} findings for ${q}\n` +
      report.findings
        .slice(0, 6)
        .map((f) => `· ${f.title}`)
        .join("\n");
  }

  if (lower.startsWith("/hermes ")) {
    const target = msg.slice(7).trim();
    const run = await runHermesSwarm({
      name: `Telegram hermes ${target}`,
      objective: "Authorized defensive footprint assessment",
      target,
      provider: "auto",
      useOpenClaw: true,
    });
    return `Hermes ${run.status}: ${run.id}\n${run.synthesis.slice(0, 1200)}`;
  }

  if (lower.startsWith("/task ")) {
    const body = msg.slice(6);
    const [titlePart, ...rest] = body.split("|");
    const title = titlePart.trim();
    const prompt = rest.join("|").trim() || title;
    const created = createKanbanTask({
      title,
      prompt,
      telegramNotify: true,
      autoReady: true,
    });
    if ("error" in created) return created.error || "Task rejected";
    return `Task created ${created.id} in ${created.column}: ${created.title}`;
  }

  if (lower === "/run") {
    const done = await runReadyKanban({ provider: "auto", limit: 4 });
    return `Executed ${done.length} ready task(s):\n` +
      done.map((t) => `· ${t.column} ${t.title}`).join("\n");
  }

  // free-form → Kanban research task
  const created = createKanbanTask({
    title: msg.slice(0, 80),
    prompt: msg,
    kind: "research",
    telegramNotify: true,
    autoReady: true,
  });
  if ("error" in created) return created.error || "Task rejected";
  const run = await runReadyKanban({ limit: 1 });
  const last = run[0];
  return last
    ? `Handled as task ${last.id} (${last.column})\n${(last.result || "").slice(0, 1500)}`
    : `Queued ${created.id}`;
}

export async function telegramHealth() {
  return {
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && ALLOWED),
    allowedUserSet: Boolean(ALLOWED),
    notes:
      "Set TELEGRAM_BOT_TOKEN + TELEGRAM_ALLOWED_USER_ID. Webhook: POST /api/v1/telegram/webhook",
  };
}

export { notifyTelegram };
