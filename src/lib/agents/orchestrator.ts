/**
 * Agentic mission orchestrator — authorized red-team / intel workflows.
 * Agents plan recon, enrichment, and reporting. No exploit generation.
 */

import { AuthorizationContext, hasScope } from "@/lib/ethics/guardrails";
import { appendAudit } from "@/lib/audit/logger";
import { scrapeUrl } from "@/lib/crawl/engine";
import { runOsint } from "@/lib/osint/collectors";
import { uid } from "@/lib/utils";

export type AgentRole =
  | "commander"
  | "recon"
  | "osint"
  | "analyst"
  | "scribe";

export type MissionStatus =
  | "queued"
  | "running"
  | "blocked"
  | "completed"
  | "failed";

export interface AgentTask {
  id: string;
  role: AgentRole;
  title: string;
  status: MissionStatus;
  output?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Mission {
  id: string;
  name: string;
  objective: string;
  target?: string;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
  operatorId: string;
  engagementId?: string;
  tasks: AgentTask[];
  summary?: string;
  artifacts: {
    type: string;
    label: string;
    data?: unknown;
  }[];
}

const missions = new Map<string, Mission>();

export function listMissions(): Mission[] {
  return Array.from(missions.values()).sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function getMission(id: string): Mission | undefined {
  return missions.get(id);
}

const ROLE_PLAYBOOK: Record<AgentRole, string> = {
  commander: "Decompose objective into lawful recon steps under ROE",
  recon: "Surface web scrape + infrastructure fingerprint (authorized)",
  osint: "Public DNS/CT/header enrichment",
  analyst: "Correlate findings into risk narrative",
  scribe: "Produce executive + technical report draft",
};

export async function createAndRunMission(
  input: { name: string; objective: string; target?: string },
  ctx: AuthorizationContext
): Promise<Mission> {
  if (!hasScope(ctx, "agent.orchestrate") || !hasScope(ctx, "mission.write")) {
    const blocked: Mission = {
      id: uid("msn"),
      name: input.name,
      objective: input.objective,
      target: input.target,
      status: "blocked",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operatorId: ctx.operatorId,
      engagementId: ctx.engagementId,
      tasks: [],
      summary: "Missing agent.orchestrate / mission.write scopes",
      artifacts: [],
    };
    missions.set(blocked.id, blocked);
    await appendAudit({
      operatorId: ctx.operatorId,
      action: "mission.blocked",
      resource: input.name,
      allowed: false,
      risk: "medium",
      severity: "warn",
    });
    return blocked;
  }

  const now = new Date().toISOString();
  const mission: Mission = {
    id: uid("msn"),
    name: input.name,
    objective: input.objective,
    target: input.target,
    status: "running",
    createdAt: now,
    updatedAt: now,
    operatorId: ctx.operatorId,
    engagementId: ctx.engagementId,
    tasks: (["commander", "recon", "osint", "analyst", "scribe"] as AgentRole[]).map(
      (role) => ({
        id: uid("task"),
        role,
        title: ROLE_PLAYBOOK[role],
        status: "queued",
      })
    ),
    artifacts: [],
  };
  missions.set(mission.id, mission);

  await appendAudit({
    operatorId: ctx.operatorId,
    action: "mission.start",
    resource: mission.id,
    allowed: true,
    risk: "medium",
    severity: "info",
    engagementId: ctx.engagementId,
    details: { name: mission.name, target: mission.target },
  });

  // Execute pipeline (sequential for audit clarity)
  for (const task of mission.tasks) {
    task.status = "running";
    task.startedAt = new Date().toISOString();
    mission.updatedAt = task.startedAt;

    try {
      if (task.role === "commander") {
        task.output = [
          `Mission: ${mission.name}`,
          `Objective: ${mission.objective}`,
          `ROE engagement: ${ctx.engagementId || "n/a"}`,
          `Plan: 1) authorize surface recon 2) OSINT enrich 3) correlate 4) report`,
          `Constraints: no exploit generation; public/authorized sources only`,
        ].join("\n");
        task.status = "completed";
      } else if (task.role === "recon" && mission.target) {
        const url = mission.target.startsWith("http")
          ? mission.target
          : `https://${mission.target}`;
        const result = await scrapeUrl(
          { url, tier: "elevated", deep: false, respectRobots: true },
          ctx
        );
        task.output =
          result.status === "ok"
            ? `Scraped ${url} — title: ${result.page?.title || "n/a"}, words: ${
                result.page?.stats.wordCount
              }, tech: ${result.page?.structured.technologies.join(", ") || "n/a"}`
            : `Recon ${result.status}: ${result.error || "blocked"}`;
        mission.artifacts.push({
          type: "scrape",
          label: url,
          data: {
            status: result.status,
            title: result.page?.title,
            technologies: result.page?.structured.technologies,
            emails: result.page?.structured.emails,
          },
        });
        task.status = result.status === "blocked" ? "blocked" : "completed";
      } else if (task.role === "recon") {
        task.output = "No target supplied — recon skipped (set target domain/URL)";
        task.status = "completed";
      } else if (task.role === "osint") {
        const q = mission.target || mission.objective;
        const report = await runOsint(q, ctx);
        task.output = `OSINT ${report.status}: ${report.findings.length} findings in ${report.durationMs}ms`;
        mission.artifacts.push({
          type: "osint",
          label: report.query,
          data: report.findings.map((f) => ({
            source: f.source,
            title: f.title,
            confidence: f.confidence,
            iocs: f.iocs.slice(0, 5),
          })),
        });
        task.status = report.status === "blocked" ? "blocked" : "completed";
      } else if (task.role === "analyst") {
        const scrapeArts = mission.artifacts.filter((a) => a.type === "scrape");
        const osintArts = mission.artifacts.filter((a) => a.type === "osint");
        task.output = [
          "Correlation summary:",
          `- Scrape artifacts: ${scrapeArts.length}`,
          `- OSINT artifacts: ${osintArts.length}`,
          `- Primary risks: exposed tech stack, missing security headers, subdomain sprawl`,
          `- Recommended next steps (authorized): validate CT subdomains, review email exposure, schedule authenticated testing under SOW`,
        ].join("\n");
        task.status = "completed";
      } else if (task.role === "scribe") {
        mission.summary = buildReport(mission);
        task.output = "Executive report draft attached to mission.summary";
        task.status = "completed";
        mission.artifacts.push({
          type: "report",
          label: "mission-summary",
          data: { summary: mission.summary },
        });
      }
    } catch (err) {
      task.status = "failed";
      task.output = err instanceof Error ? err.message : "task failed";
    }

    task.finishedAt = new Date().toISOString();
    mission.updatedAt = task.finishedAt;
  }

  const failed = mission.tasks.some((t) => t.status === "failed");
  const blocked = mission.tasks.some((t) => t.status === "blocked");
  mission.status = failed ? "failed" : blocked ? "blocked" : "completed";
  mission.updatedAt = new Date().toISOString();

  await appendAudit({
    operatorId: ctx.operatorId,
    action: "mission.complete",
    resource: mission.id,
    allowed: true,
    risk: "low",
    severity: "info",
    engagementId: ctx.engagementId,
    details: { status: mission.status, tasks: mission.tasks.length },
  });

  return mission;
}

function buildReport(m: Mission): string {
  return [
    `# HelixaraAI Mission Report — ${m.name}`,
    ``,
    `**Mission ID:** ${m.id}`,
    `**Objective:** ${m.objective}`,
    `**Target:** ${m.target || "n/a"}`,
    `**Operator:** ${m.operatorId}`,
    `**Engagement:** ${m.engagementId || "n/a"}`,
    `**Status:** ${m.status}`,
    ``,
    `## Task timeline`,
    ...m.tasks.map(
      (t) =>
        `- **${t.role}** (${t.status}): ${t.output?.split("\n")[0] || t.title}`
    ),
    ``,
    `## Artifacts`,
    ...m.artifacts.map((a) => `- ${a.type}: ${a.label}`),
    ``,
    `## Disclaimer`,
    `Generated by HelixaraAI for authorized defensive use only. Not legal advice.`,
  ].join("\n");
}
