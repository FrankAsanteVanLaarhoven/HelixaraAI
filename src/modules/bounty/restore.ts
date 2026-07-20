/**
 * Restore / remediation workflow for bounty findings.
 * Guided steps + optional health probe — not arbitrary remote code execution.
 */

import { uid } from "@/lib/utils";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";
import { emitEvent } from "@/modules/events/bus";
import {
  getFinding,
  getProgram,
  getRestore,
  saveFinding,
  saveRestore,
} from "@/modules/bounty/store";
import { isInScope, toHttpsUrl } from "@/modules/bounty/scope";
import type { RestoreJob, RestoreStep } from "@/modules/bounty/types";

function defaultSteps(findingTitle: string): RestoreStep[] {
  return [
    {
      id: uid("rst"),
      title: "Acknowledge finding",
      detail: `Confirm ${findingTitle} is accepted under program ROE`,
      status: "pending",
    },
    {
      id: uid("rst"),
      title: "Apply remediation",
      detail: "Implement listed remediation controls in the target environment",
      status: "pending",
    },
    {
      id: uid("rst"),
      title: "Deploy / config change",
      detail: "Ship change via normal change-control; record ticket id in notes",
      status: "pending",
    },
    {
      id: uid("rst"),
      title: "Verify health probe",
      detail: "Run restore_health_probe to confirm service still healthy",
      status: "pending",
    },
    {
      id: uid("rst"),
      title: "Close finding",
      detail: "Mark finding restored/verified after probe success",
      status: "pending",
    },
  ];
}

export async function createRestoreJob(findingId: string): Promise<
  | { ok: true; job: RestoreJob }
  | { ok: false; reason: string }
> {
  const finding = getFinding(findingId);
  if (!finding) return { ok: false, reason: "finding not found" };
  const program = getProgram(finding.programId);
  if (!program) return { ok: false, reason: "program not found" };

  const scope = isInScope(program, finding.target);
  if (!scope.ok) return { ok: false, reason: scope.reason };

  if (finding.restoreJobId) {
    const existing = getRestore(finding.restoreJobId);
    if (existing) return { ok: true, job: existing };
  }

  const id = uid("brest");
  const now = new Date().toISOString();
  const job: RestoreJob = {
    id,
    shortId: id.slice(-8),
    programId: program.id,
    findingId: finding.id,
    target: finding.target,
    status: "planned",
    steps: defaultSteps(finding.title),
    createdAt: now,
    updatedAt: now,
  };
  // auto-complete first step
  job.steps[0].status = "done";
  job.steps[0].completedAt = now;
  job.status = "in_progress";
  saveRestore(job);

  finding.restoreJobId = job.id;
  finding.status = "restoring";
  saveFinding(finding);

  await appendAudit({
    operatorId: demoOperator().operatorId,
    action: "bounty.restore.create",
    allowed: true,
    risk: "medium",
    severity: "info",
    engagementId: program.engagementId,
    details: { jobId: job.id, findingId: finding.id },
  });

  return { ok: true, job };
}

export async function advanceRestoreStep(input: {
  jobId: string;
  stepId: string;
  status: "done" | "skipped" | "failed";
  note?: string;
}): Promise<{ ok: true; job: RestoreJob } | { ok: false; reason: string }> {
  const job = getRestore(input.jobId);
  if (!job) return { ok: false, reason: "job not found" };
  const step = job.steps.find((s) => s.id === input.stepId);
  if (!step) return { ok: false, reason: "step not found" };

  step.status = input.status;
  step.note = input.note?.slice(0, 500);
  step.completedAt = new Date().toISOString();
  job.status = "in_progress";
  saveRestore(job);
  return { ok: true, job };
}

export async function runRestoreHealthProbe(jobId: string): Promise<
  | { ok: true; job: RestoreJob; verifyOk: boolean; detail: string }
  | { ok: false; reason: string }
> {
  const job = getRestore(jobId);
  if (!job) return { ok: false, reason: "job not found" };
  const program = getProgram(job.programId);
  if (!program) return { ok: false, reason: "program not found" };
  const scope = isInScope(program, job.target);
  if (!scope.ok) return { ok: false, reason: scope.reason };

  job.status = "awaiting_verify";
  const url = toHttpsUrl(job.target);
  let verifyOk = false;
  let detail = "";
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "HelixaraAI-Bounty-Restore/0.2 (+authorized-scope)",
      },
    });
    verifyOk = res.status > 0 && res.status < 500;
    detail = `GET ${url} → HTTP ${res.status}`;
  } catch (e) {
    verifyOk = false;
    detail = e instanceof Error ? e.message : "probe failed";
  }

  job.verifyOk = verifyOk;
  job.verifyDetail = detail;

  // mark verify step
  const verifyStep = job.steps.find((s) =>
    s.title.toLowerCase().includes("verify")
  );
  if (verifyStep) {
    verifyStep.status = verifyOk ? "done" : "failed";
    verifyStep.note = detail;
    verifyStep.completedAt = new Date().toISOString();
  }

  if (verifyOk) {
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    const closeStep = job.steps.find((s) =>
      s.title.toLowerCase().includes("close")
    );
    if (closeStep) {
      closeStep.status = "done";
      closeStep.completedAt = job.completedAt;
    }
    const finding = getFinding(job.findingId);
    if (finding) {
      finding.status = "restored";
      saveFinding(finding);
    }
  } else {
    job.status = "failed";
  }
  saveRestore(job);

  await appendAudit({
    operatorId: demoOperator().operatorId,
    action: "bounty.restore.verify",
    allowed: true,
    risk: "low",
    severity: "info",
    engagementId: program.engagementId,
    details: { jobId: job.id, verifyOk, detail },
  });

  emitEvent({
    type: "mission.completed",
    source: "bounty.restore",
    severity: verifyOk ? "info" : "warn",
    title: `Restore probe ${verifyOk ? "ok" : "failed"} · ${job.shortId}`,
    payload: { jobId: job.id, verifyOk },
  });

  return { ok: true, job, verifyOk, detail };
}

export async function completeRestore(jobId: string): Promise<
  | { ok: true; job: RestoreJob }
  | { ok: false; reason: string }
> {
  const job = getRestore(jobId);
  if (!job) return { ok: false, reason: "job not found" };
  if (!job.verifyOk) {
    return {
      ok: false,
      reason: "Run successful health probe before complete",
    };
  }
  for (const s of job.steps) {
    if (s.status === "pending") {
      s.status = "done";
      s.completedAt = new Date().toISOString();
    }
  }
  job.status = "completed";
  job.completedAt = new Date().toISOString();
  saveRestore(job);

  const finding = getFinding(job.findingId);
  if (finding) {
    finding.status = "verified";
    finding.closedAt = new Date().toISOString();
    saveFinding(finding);
  }
  return { ok: true, job };
}
