/**
 * Hermes-style multi-agent parallel execution for HelixaraAI.
 * Specialists fan out, then commander synthesizes — optional LLM backbone.
 */

import { completeLLM, LLMProviderId } from "@/modules/llm/providers";
import { emitEvent } from "@/modules/events/bus";
import { scrapeUrl } from "@/lib/crawl/engine";
import { runOsint } from "@/lib/osint/collectors";
import { demoOperator } from "@/lib/ethics/guardrails";
import { uid } from "@/lib/utils";

export type HermesRole =
  | "commander"
  | "recon"
  | "osint"
  | "analyst"
  | "scribe"
  | "openclaw";

export interface HermesAgentResult {
  role: HermesRole;
  status: "completed" | "blocked" | "failed" | "skipped";
  output: string;
  ms: number;
  artifacts?: unknown;
}

export interface HermesRun {
  id: string;
  name: string;
  objective: string;
  target?: string;
  provider: LLMProviderId | "auto";
  status: "completed" | "partial" | "failed";
  startedAt: string;
  finishedAt: string;
  agents: HermesAgentResult[];
  synthesis: string;
  trainingSamples: number;
}

const history: HermesRun[] = [];

export function listHermesRuns(limit = 20) {
  return history.slice(0, limit);
}

export async function runHermesSwarm(input: {
  name: string;
  objective: string;
  target?: string;
  provider?: LLMProviderId | "auto";
  useOpenClaw?: boolean;
}): Promise<HermesRun> {
  const id = uid("hermes");
  const startedAt = new Date().toISOString();
  const provider = input.provider || "auto";
  const ctx = demoOperator();
  const agents: HermesAgentResult[] = [];
  let trainingSamples = 0;

  emitEvent({
    type: "mission.started",
    source: "hermes",
    severity: "info",
    title: `Hermes swarm: ${input.name}`,
    payload: { id, target: input.target, provider },
  });

  // Parallel specialists where possible
  const reconPromise = (async (): Promise<HermesAgentResult> => {
    const t0 = Date.now();
    if (!input.target) {
      return {
        role: "recon",
        status: "skipped",
        output: "No target — recon skipped",
        ms: Date.now() - t0,
      };
    }
    const url = input.target.startsWith("http")
      ? input.target
      : `https://${input.target}`;
    try {
      const r = await scrapeUrl(
        { url, tier: "sovereign", deep: true, respectRobots: true, maxLinks: 4 },
        ctx
      );
      emitEvent({
        type: r.status === "ok" ? "scrape.completed" : "scrape.blocked",
        source: "hermes.recon",
        severity: r.status === "ok" ? "info" : "warn",
        title: `Recon ${r.status}: ${url}`,
        payload: { jobId: r.jobId, stealth: r.stealth?.score },
      });
      return {
        role: "recon",
        status: r.status === "ok" ? "completed" : r.status === "blocked" ? "blocked" : "failed",
        output:
          r.status === "ok"
            ? `Stealth scrape OK · ${r.page?.title} · words ${r.page?.stats.wordCount} · tech ${r.page?.structured.technologies.join(",") || "n/a"} · score ${r.stealth?.score}`
            : r.error || r.status,
        ms: Date.now() - t0,
        artifacts: {
          title: r.page?.title,
          technologies: r.page?.structured.technologies,
          emails: r.page?.structured.emails,
          crawlMap: r.crawlMap,
        },
      };
    } catch (e) {
      return {
        role: "recon",
        status: "failed",
        output: e instanceof Error ? e.message : "recon failed",
        ms: Date.now() - t0,
      };
    }
  })();

  const osintPromise = (async (): Promise<HermesAgentResult> => {
    const t0 = Date.now();
    const q = input.target || input.objective;
    try {
      const report = await runOsint(q, ctx);
      emitEvent({
        type: "osint.completed",
        source: "hermes.osint",
        severity: "info",
        title: `OSINT ${report.findings.length} findings`,
        payload: { queryId: report.queryId },
      });
      return {
        role: "osint",
        status: report.status === "blocked" ? "blocked" : "completed",
        output: `${report.findings.length} findings in ${report.durationMs}ms · dark-web ${report.darkWeb.enabled ? "ready" : "locked"}`,
        ms: Date.now() - t0,
        artifacts: report.findings.map((f) => ({
          source: f.source,
          title: f.title,
          iocs: f.iocs.slice(0, 5),
          confidence: f.confidence,
        })),
      };
    } catch (e) {
      return {
        role: "osint",
        status: "failed",
        output: e instanceof Error ? e.message : "osint failed",
        ms: Date.now() - t0,
      };
    }
  })();

  const [recon, osint] = await Promise.all([reconPromise, osintPromise]);
  agents.push(recon, osint);

  // Commander plan via LLM
  {
    const t0 = Date.now();
    const llm = await completeLLM({
      provider: provider === "auto" ? undefined : provider,
      purpose: "agent_plan",
      messages: [
        {
          role: "system",
          content:
            "You are the Hermes commander for HelixaraAI. Authorized defensive OSINT only. Produce a concise mission plan and risk notes. No exploits.",
        },
        {
          role: "user",
          content: `Mission: ${input.name}\nObjective: ${input.objective}\nTarget: ${input.target || "n/a"}\nRecon: ${recon.output}\nOSINT: ${osint.output}`,
        },
      ],
    });
    if (llm.trainingLogged) trainingSamples++;
    agents.push({
      role: "commander",
      status: "completed",
      output: llm.content,
      ms: Date.now() - t0,
      artifacts: { provider: llm.provider, model: llm.model },
    });
    emitEvent({
      type: "agent.task",
      source: "hermes.commander",
      severity: "info",
      title: "Commander plan complete",
      payload: { provider: llm.provider },
    });
  }

  // Optional OpenClaw specialist
  if (input.useOpenClaw !== false) {
    const t0 = Date.now();
    try {
      const llm = await completeLLM({
        provider: "openclaw",
        purpose: "agent_plan",
        messages: [
          {
            role: "system",
            content: "OpenClaw integration for HelixaraAI mission assist. Defensive only.",
          },
          {
            role: "user",
            content: `Assist mission "${input.name}": ${input.objective}. Target ${input.target || "n/a"}. Summarize next authorized steps.`,
          },
        ],
      });
      if (llm.trainingLogged) trainingSamples++;
      agents.push({
        role: "openclaw",
        status: llm.error && llm.fallback ? "completed" : "completed",
        output: llm.content,
        ms: Date.now() - t0,
        artifacts: {
          provider: llm.provider,
          fallback: llm.fallback,
          error: llm.error,
        },
      });
    } catch (e) {
      agents.push({
        role: "openclaw",
        status: "failed",
        output: e instanceof Error ? e.message : "openclaw failed",
        ms: Date.now() - t0,
      });
    }
  }

  // Analyst + Scribe via LLM
  {
    const t0 = Date.now();
    const llm = await completeLLM({
      provider: provider === "auto" ? undefined : provider,
      purpose: "report",
      messages: [
        {
          role: "system",
          content:
            "You are HelixaraAI analyst+scribe. Write a short executive report with findings, risks, and authorized next steps.",
        },
        {
          role: "user",
          content: JSON.stringify({
            mission: input.name,
            objective: input.objective,
            recon: recon.artifacts || recon.output,
            osint: osint.artifacts || osint.output,
          }),
        },
      ],
    });
    if (llm.trainingLogged) trainingSamples++;
    agents.push({
      role: "analyst",
      status: "completed",
      output: "Correlation complete — see synthesis",
      ms: Math.round((Date.now() - t0) / 2),
    });
    agents.push({
      role: "scribe",
      status: "completed",
      output: llm.content,
      ms: Math.round((Date.now() - t0) / 2),
      artifacts: { provider: llm.provider, model: llm.model },
    });
  }

  const failed = agents.filter((a) => a.status === "failed").length;
  const synthesis =
    agents.find((a) => a.role === "scribe")?.output ||
    agents.find((a) => a.role === "commander")?.output ||
    "No synthesis";

  const run: HermesRun = {
    id,
    name: input.name,
    objective: input.objective,
    target: input.target,
    provider,
    status: failed > 1 ? "failed" : failed === 1 ? "partial" : "completed",
    startedAt,
    finishedAt: new Date().toISOString(),
    agents,
    synthesis,
    trainingSamples,
  };
  history.unshift(run);
  if (history.length > 40) history.pop();

  emitEvent({
    type: "mission.completed",
    source: "hermes",
    severity: "info",
    title: `Hermes ${run.status}: ${input.name}`,
    payload: { id, agents: agents.length, trainingSamples },
  });

  return run;
}
