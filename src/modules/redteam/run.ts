/**
 * Execute ROE-gated Red Team phases: recon / OSINT / report only.
 */

import { appendAudit } from "@/lib/audit/logger";
import { scrapeUrl } from "@/lib/crawl/engine";
import { runOsint } from "@/lib/osint/collectors";
import {
  demoOperator,
  type AuthScope,
  type AuthorizationContext,
} from "@/lib/ethics/guardrails";
import { uid } from "@/lib/utils";
import { emitEvent } from "@/modules/events/bus";
import { completeLLM } from "@/modules/llm/providers";
import { runHermesSwarm } from "@/modules/agents/hermes";
import {
  getEngagement,
  setEngagementStatus,
  touchEngagement,
} from "@/modules/redteam/store";
import {
  ENGAGEMENT_TYPE_META,
  FORBIDDEN_ACTIVITIES,
  type RedTeamEngagement,
} from "@/modules/redteam/types";

const OFFENSIVE_PROBE =
  /\b(exploit|payload|phishing|smishing|deauth|jam(ming)?|weaponiz|credential\s*harvest|sqlmap|metasploit|c2\s*beacon|reverse\s*shell)\b/i;

function engCtx(eng: RedTeamEngagement): AuthorizationContext {
  const roe = eng.roe;
  return demoOperator({
    engagementId: roe?.engagementId || eng.id,
    legalBasis: roe?.legalBasis || "Missing ROE",
    expiresAt: roe?.expiresAt,
    allowPrivateTargets: Boolean(roe?.allowPrivateTargets && eng.labOnly),
    scopes: [
      "osint.public",
      "scrape.surface",
      "mission.read",
      "mission.write",
      "audit.read",
      "geospatial.read",
      "agent.orchestrate",
      "redteam.engage",
      ...(eng.allowedActivities.includes("scrape.deep")
        ? (["scrape.deep"] as AuthScope[])
        : []),
    ] as AuthScope[],
  });
}

export function assertCanRun(eng: RedTeamEngagement): { ok: true } | { ok: false; reason: string } {
  if (OFFENSIVE_PROBE.test(eng.objective) || OFFENSIVE_PROBE.test(eng.name)) {
    return {
      ok: false,
      reason:
        "Objective contains prohibited offensive language. Red Team module is recon/OSINT/report only.",
    };
  }
  for (const f of FORBIDDEN_ACTIVITIES) {
    if (eng.objective.toLowerCase().includes(f.replace(/_/g, " "))) {
      return { ok: false, reason: `Forbidden activity referenced: ${f}` };
    }
  }

  const meta = ENGAGEMENT_TYPE_META[eng.type];
  if (meta.requiresRoe) {
    if (!eng.roe?.engagementId || !eng.roe.legalBasis) {
      return { ok: false, reason: "ROE attestation required before run" };
    }
    if (new Date(eng.roe.expiresAt).getTime() < Date.now()) {
      return { ok: false, reason: "ROE attestation expired" };
    }
  }

  if (eng.status === "closed") {
    return { ok: false, reason: "Engagement is closed" };
  }

  if (eng.type === "wireless_lab_observe") {
    // Observation only — no active RF
    return { ok: true };
  }

  return { ok: true };
}

export async function runEngagement(
  engagementId: string,
  opts?: { useHermes?: boolean }
): Promise<RedTeamEngagement> {
  const eng = getEngagement(engagementId);
  if (!eng) throw new Error("engagement not found");

  const gate = assertCanRun(eng);
  if (!gate.ok) {
    eng.blockReason = gate.reason;
    setEngagementStatus(eng, "blocked", gate.reason);
    await appendAudit({
      operatorId: "operator.demo",
      action: "redteam.blocked",
      allowed: false,
      risk: "high",
      severity: "warn",
      engagementId: eng.roe?.engagementId || eng.id,
      details: { reason: gate.reason, type: eng.type },
    });
    return eng;
  }

  const ctx = engCtx(eng);
  setEngagementStatus(eng, "recon_running", "Starting authorized recon phase");

  emitEvent({
    type: "mission.started",
    source: "redteam",
    severity: "info",
    title: `Red Team eng ${eng.shortId}: ${eng.name}`,
    payload: { id: eng.id, type: eng.type, target: eng.target },
  });

  // --- OSINT phase ---
  if (eng.allowedActivities.includes("osint.public") && eng.target) {
    try {
      const report = await runOsint(eng.target, ctx);
      eng.findings.push({
        id: uid("rtf"),
        source: "osint",
        title: `OSINT · ${eng.target}`,
        summary: `${report.findings.length} public findings · status ${report.status}`,
        severity: report.status === "blocked" ? "medium" : "info",
        ts: new Date().toISOString(),
        artifacts: {
          findings: report.findings.slice(0, 12).map((f) => ({
            source: f.source,
            title: f.title,
            confidence: f.confidence,
            iocs: f.iocs.slice(0, 5),
          })),
        },
      });
      eng.phases.push({
        id: uid("rtp"),
        phase: "osint",
        status: report.status === "blocked" ? "blocked" : "ok",
        message: `OSINT complete · ${report.findings.length} findings`,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      eng.phases.push({
        id: uid("rtp"),
        phase: "osint",
        status: "failed",
        message: e instanceof Error ? e.message : "osint failed",
        ts: new Date().toISOString(),
      });
    }
  }

  // --- Surface scrape phase ---
  if (
    (eng.allowedActivities.includes("scrape.surface") ||
      eng.allowedActivities.includes("scrape.deep")) &&
    eng.target
  ) {
    const url = eng.target.startsWith("http")
      ? eng.target
      : `https://${eng.target}`;
    const deep =
      eng.allowedActivities.includes("scrape.deep") && eng.labOnly;
    try {
      const r = await scrapeUrl(
        {
          url,
          tier: eng.labOnly ? "sovereign" : "elevated",
          deep,
          respectRobots: true,
          maxLinks: deep ? 6 : 3,
        },
        ctx
      );
      eng.findings.push({
        id: uid("rtf"),
        source: "scrape",
        title: `Surface · ${url}`,
        summary:
          r.status === "ok"
            ? `${r.page?.title || "page"} · words ${r.page?.stats.wordCount ?? 0} · tech ${(r.page?.structured.technologies || []).join(", ") || "n/a"}`
            : r.error || r.status,
        severity: r.status === "ok" ? "info" : "medium",
        ts: new Date().toISOString(),
        artifacts: {
          status: r.status,
          technologies: r.page?.structured.technologies,
          emails: r.page?.structured.emails,
        },
      });
      eng.phases.push({
        id: uid("rtp"),
        phase: "scrape",
        status: r.status === "ok" ? "ok" : r.status === "blocked" ? "blocked" : "failed",
        message: `Crawl ${r.status}`,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      eng.phases.push({
        id: uid("rtp"),
        phase: "scrape",
        status: "failed",
        message: e instanceof Error ? e.message : "scrape failed",
        ts: new Date().toISOString(),
      });
    }
  }

  // --- Wireless lab observe (note only — no RF) ---
  if (eng.allowedActivities.includes("lab.observe") && eng.type === "wireless_lab_observe") {
    eng.findings.push({
      id: uid("rtf"),
      source: "lab",
      title: "Wireless lab observation",
      summary:
        "Observation-only path. Use /console/lab-wifi and /console/wids for software sim and detection. RF inject / deauth permanently off.",
      severity: "info",
      ts: new Date().toISOString(),
      artifacts: {
        links: ["/console/lab-wifi", "/console/wids", "/console/wireless"],
        rfInject: false,
        deauth: false,
      },
    });
    eng.phases.push({
      id: uid("rtp"),
      phase: "lab.observe",
      status: "ok",
      message: "Lab observe note recorded (no OTA)",
      ts: new Date().toISOString(),
    });
  }

  // --- Optional Hermes swarm (defensive) ---
  if (opts?.useHermes !== false && eng.allowedActivities.includes("mission.orchestrate")) {
    try {
      const run = await runHermesSwarm({
        name: `RT ${eng.shortId}: ${eng.name}`,
        objective: eng.objective,
        target: eng.target,
        provider: "hermes-native",
        useOpenClaw: false,
      });
      eng.hermesRunId = run.id;
      eng.findings.push({
        id: uid("rtf"),
        source: "report",
        title: "Agent swarm synthesis",
        summary: run.synthesis.slice(0, 500),
        severity: "info",
        ts: new Date().toISOString(),
        artifacts: {
          runId: run.id,
          status: run.status,
          agents: run.agents.map((a) => ({ role: a.role, status: a.status })),
        },
      });
      eng.phases.push({
        id: uid("rtp"),
        phase: "hermes",
        status: run.status === "failed" ? "failed" : "ok",
        message: `Swarm ${run.status}`,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      eng.phases.push({
        id: uid("rtp"),
        phase: "hermes",
        status: "failed",
        message: e instanceof Error ? e.message : "swarm failed",
        ts: new Date().toISOString(),
      });
    }
  }

  // --- Report ---
  if (eng.allowedActivities.includes("report.generate")) {
    setEngagementStatus(eng, "reporting", "Generating report");
    try {
      const llm = await completeLLM({
        provider: "hermes-native",
        purpose: "report",
        model: process.env.HERMES_FREE_MODEL || "free",
        messages: [
          {
            role: "system",
            content:
              "You are HelixaraAI Red Team scribe. Authorized defensive recon only. Write an executive + technical report from findings. No exploit advice, no attack steps, no phishing.",
          },
          {
            role: "user",
            content: JSON.stringify({
              engagement: eng.name,
              type: eng.type,
              objective: eng.objective,
              target: eng.target,
              roe: eng.roe
                ? {
                    id: eng.roe.engagementId,
                    legalBasis: eng.roe.legalBasis,
                    scope: eng.roe.scopeSummary,
                  }
                : null,
              findings: eng.findings.map((f) => ({
                source: f.source,
                title: f.title,
                summary: f.summary,
                severity: f.severity,
              })),
            }),
          },
        ],
      });
      eng.report = llm.content;
      eng.phases.push({
        id: uid("rtp"),
        phase: "report",
        status: "ok",
        message: `Report via ${llm.provider}/${llm.model}`,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      eng.report = [
        `# Red Team Report · ${eng.name}`,
        ``,
        `Type: ${eng.type}`,
        `Objective: ${eng.objective}`,
        `Target: ${eng.target || "n/a"}`,
        ``,
        `## Findings`,
        ...eng.findings.map((f) => `- [${f.severity}] ${f.title}: ${f.summary}`),
        ``,
        `## Note`,
        e instanceof Error ? e.message : "LLM report unavailable",
        ``,
        `Scope remains recon / OSINT / reporting only.`,
      ].join("\n");
      eng.phases.push({
        id: uid("rtp"),
        phase: "report",
        status: "failed",
        message: "Fallback text report",
        ts: new Date().toISOString(),
      });
    }
  }

  setEngagementStatus(eng, "active", "Recon cycle complete — review report");
  touchEngagement(eng);

  await appendAudit({
    operatorId: ctx.operatorId,
    action: "redteam.run",
    allowed: true,
    risk: "medium",
    severity: "info",
    engagementId: eng.roe?.engagementId || eng.id,
    details: {
      id: eng.id,
      type: eng.type,
      findings: eng.findings.length,
      status: eng.status,
    },
  });

  emitEvent({
    type: "mission.completed",
    source: "redteam",
    severity: "info",
    title: `Red Team eng ${eng.shortId} cycle done`,
    payload: { id: eng.id, findings: eng.findings.length },
  });

  return eng;
}

export async function closeEngagement(id: string): Promise<RedTeamEngagement> {
  const eng = getEngagement(id);
  if (!eng) throw new Error("engagement not found");
  setEngagementStatus(eng, "closed", "Engagement closed by operator");
  await appendAudit({
    operatorId: "operator.demo",
    action: "redteam.close",
    allowed: true,
    risk: "low",
    severity: "info",
    engagementId: eng.roe?.engagementId || eng.id,
    details: { id: eng.id },
  });
  return eng;
}
