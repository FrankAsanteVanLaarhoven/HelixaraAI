/**
 * Consequence-aware advice ledger.
 * Every piece of advice is timestamped, explained, and later linked to outcomes
 * so HelixaraAI can train on "what happened after good/bad advice."
 */

import { promises as fs } from "fs";
import path from "path";
import { uid } from "@/lib/utils";
import { emitEvent } from "@/modules/events/bus";

export type AdviceQualityLabel = "pending" | "good" | "bad" | "mixed" | "unknown";

export interface ExplainabilityBlock {
  /** Human-readable why this advice was produced */
  rationale: string;
  /** Structured factors contributing to the recommendation */
  factors: { key: string; value: string; weight?: number }[];
  /** Sources / modules consulted */
  sources: string[];
  /** Model / rule path used */
  method: string;
  /** Confidence 0–1 at advice time */
  confidence: number;
  /** Privacy mode when advice was given */
  privacyMode?: string;
  /** Counterfactuals or alternatives considered */
  alternatives?: string[];
}

export interface AdviceRecord {
  id: string;
  createdAt: string;
  /** When advice was shown to operator */
  advisedAt: string;
  operatorId: string;
  engagementId?: string;
  context: string;
  advice: string;
  category: string;
  tags: string[];
  explainability: ExplainabilityBlock;
  /** Filled when outcome is known */
  outcome?: {
    labeledAt: string;
    label: AdviceQualityLabel;
    whatHappened: string;
    impact?: string;
    metrics?: Record<string, number | string>;
    labeledBy: string;
  };
  /** Derived for training */
  trainingEligible: boolean;
}

export interface ConsequenceModelSnapshot {
  version: string;
  trainedAt: string;
  sampleCount: number;
  goodCount: number;
  badCount: number;
  mixedCount: number;
  /** Simple priors: category → P(good) */
  categoryGoodRate: Record<string, number>;
  /** Factor keys associated with bad outcomes */
  riskFactors: { key: string; badHits: number; total: number; badRate: number }[];
  /** Phrase signals from bad vs good advice text */
  tokens: {
    goodBias: string[];
    badBias: string[];
  };
  notes: string[];
}

const MAX_RECORDS = 5000;
let records: AdviceRecord[] = [];
let model: ConsequenceModelSnapshot | null = null;

function dataDir() {
  return path.join(process.cwd(), "data", "consequence");
}

function ledgerFile() {
  return path.join(dataDir(), "ledger.ndjson");
}

function modelFile() {
  return path.join(dataDir(), "model.json");
}

export async function loadLedger(): Promise<void> {
  try {
    const raw = await fs.readFile(ledgerFile(), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    records = lines.map((l) => JSON.parse(l) as AdviceRecord);
  } catch {
    records = [];
  }
  try {
    const m = await fs.readFile(modelFile(), "utf8");
    model = JSON.parse(m) as ConsequenceModelSnapshot;
  } catch {
    model = null;
  }
}

async function appendRecord(rec: AdviceRecord) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.appendFile(ledgerFile(), JSON.stringify(rec) + "\n", "utf8");
}

async function rewriteLedger() {
  await fs.mkdir(dataDir(), { recursive: true });
  const body = records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");
  await fs.writeFile(ledgerFile(), body, "utf8");
}

export async function recordAdvice(input: {
  context: string;
  advice: string;
  category?: string;
  tags?: string[];
  operatorId?: string;
  engagementId?: string;
  explainability: ExplainabilityBlock;
}): Promise<AdviceRecord> {
  if (!records.length) await loadLedger();
  const now = new Date().toISOString();
  const rec: AdviceRecord = {
    id: uid("adv"),
    createdAt: now,
    advisedAt: now,
    operatorId: input.operatorId || "operator.demo",
    engagementId: input.engagementId,
    context: input.context.slice(0, 8000),
    advice: input.advice.slice(0, 8000),
    category: input.category || "general",
    tags: input.tags || [],
    explainability: input.explainability,
    trainingEligible: false,
  };
  records.unshift(rec);
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  await appendRecord(rec);

  emitEvent({
    type: "llm.completion",
    source: "consequence.advice",
    severity: "info",
    title: `Advice logged · ${rec.id}`,
    payload: {
      id: rec.id,
      category: rec.category,
      confidence: rec.explainability.confidence,
      method: rec.explainability.method,
    },
  });

  return rec;
}

export async function labelOutcome(
  adviceId: string,
  input: {
    label: Exclude<AdviceQualityLabel, "pending">;
    whatHappened: string;
    impact?: string;
    metrics?: Record<string, number | string>;
    labeledBy?: string;
  }
): Promise<AdviceRecord | null> {
  if (!records.length) await loadLedger();
  const rec = records.find((r) => r.id === adviceId);
  if (!rec) return null;

  rec.outcome = {
    labeledAt: new Date().toISOString(),
    label: input.label,
    whatHappened: input.whatHappened.slice(0, 8000),
    impact: input.impact,
    metrics: input.metrics,
    labeledBy: input.labeledBy || "operator.demo",
  };
  rec.trainingEligible = input.label === "good" || input.label === "bad" || input.label === "mixed";

  await rewriteLedger();

  emitEvent({
    type: "agent.task",
    source: "consequence.outcome",
    severity: input.label === "bad" ? "warn" : "info",
    title: `Outcome ${input.label} · ${adviceId}`,
    payload: {
      adviceId,
      label: input.label,
      latencyMs:
        +new Date(rec.outcome.labeledAt) - +new Date(rec.advisedAt),
    },
  });

  return rec;
}

export function listAdvice(opts?: {
  limit?: number;
  unlabeledOnly?: boolean;
  label?: AdviceQualityLabel;
}): AdviceRecord[] {
  let list = records;
  if (opts?.unlabeledOnly) list = list.filter((r) => !r.outcome);
  if (opts?.label) {
    list = list.filter((r) =>
      opts.label === "pending" ? !r.outcome : r.outcome?.label === opts.label
    );
  }
  return list.slice(0, opts?.limit ?? 100);
}

export function getAdvice(id: string) {
  return records.find((r) => r.id === id);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && t.length < 24);
}

/** Train / refresh the local consequence model from labeled ledger */
export async function trainConsequenceModel(): Promise<ConsequenceModelSnapshot> {
  if (!records.length) await loadLedger();
  const labeled = records.filter(
    (r) => r.outcome && (r.outcome.label === "good" || r.outcome.label === "bad" || r.outcome.label === "mixed")
  );

  const good = labeled.filter((r) => r.outcome!.label === "good");
  const bad = labeled.filter((r) => r.outcome!.label === "bad");
  const mixed = labeled.filter((r) => r.outcome!.label === "mixed");

  const categoryGoodRate: Record<string, number> = {};
  const catCounts: Record<string, { g: number; t: number }> = {};
  for (const r of labeled) {
    const c = r.category;
    if (!catCounts[c]) catCounts[c] = { g: 0, t: 0 };
    catCounts[c].t++;
    if (r.outcome!.label === "good") catCounts[c].g++;
  }
  for (const [c, v] of Object.entries(catCounts)) {
    categoryGoodRate[c] = v.t ? v.g / v.t : 0.5;
  }

  const factorStats = new Map<string, { bad: number; total: number }>();
  for (const r of labeled) {
    for (const f of r.explainability.factors) {
      const key = `${f.key}:${f.value}`.slice(0, 80);
      const st = factorStats.get(key) || { bad: 0, total: 0 };
      st.total++;
      if (r.outcome!.label === "bad") st.bad++;
      factorStats.set(key, st);
    }
  }
  const riskFactors = Array.from(factorStats.entries())
    .map(([key, st]) => ({
      key,
      badHits: st.bad,
      total: st.total,
      badRate: st.total ? st.bad / st.total : 0,
    }))
    .filter((x) => x.total >= 1)
    .sort((a, b) => b.badRate - a.badRate || b.badHits - a.badHits)
    .slice(0, 40);

  const goodTok = new Map<string, number>();
  const badTok = new Map<string, number>();
  for (const r of good) {
    for (const t of tokenize(r.advice + " " + r.context)) {
      goodTok.set(t, (goodTok.get(t) || 0) + 1);
    }
  }
  for (const r of bad) {
    for (const t of tokenize(r.advice + " " + r.context)) {
      badTok.set(t, (badTok.get(t) || 0) + 1);
    }
  }

  const scoreTok = (m: Map<string, number>, other: Map<string, number>) =>
    Array.from(m.entries())
      .map(([t, n]) => ({ t, s: n / (1 + (other.get(t) || 0)) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 25)
      .map((x) => x.t);

  model = {
    version: `consq-${Date.now().toString(36)}`,
    trainedAt: new Date().toISOString(),
    sampleCount: labeled.length,
    goodCount: good.length,
    badCount: bad.length,
    mixedCount: mixed.length,
    categoryGoodRate,
    riskFactors,
    tokens: {
      goodBias: scoreTok(goodTok, badTok),
      badBias: scoreTok(badTok, goodTok),
    },
    notes: [
      "Local consequence model: classical stats over labeled advice→outcome pairs.",
      "Export JSONL for further fine-tuning of Ollama / LoRA adapters.",
      "Not a substitute for human ROE judgment.",
    ],
  };

  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(modelFile(), JSON.stringify(model, null, 2), "utf8");

  emitEvent({
    type: "agent.task",
    source: "consequence.train",
    severity: "info",
    title: `Consequence model trained · n=${labeled.length}`,
    payload: {
      version: model.version,
      good: good.length,
      bad: bad.length,
    },
  });

  return model;
}

export function getConsequenceModel() {
  return model;
}

/** Score draft advice using trained consequence model + explainability */
export function scoreAdviceDraft(input: {
  context: string;
  advice: string;
  category?: string;
  factors?: { key: string; value: string }[];
}): {
  predictedQuality: "likely_good" | "likely_bad" | "uncertain";
  score: number;
  explanation: string[];
  modelVersion: string | null;
} {
  if (!model || model.sampleCount < 3) {
    return {
      predictedQuality: "uncertain",
      score: 0.5,
      explanation: [
        "Insufficient labeled outcomes to score reliably — log advice and label results to train.",
      ],
      modelVersion: model?.version || null,
    };
  }

  let score = 0.5;
  const explanation: string[] = [];
  const cat = input.category || "general";
  if (model.categoryGoodRate[cat] != null) {
    const r = model.categoryGoodRate[cat];
    score = 0.4 * score + 0.6 * r;
    explanation.push(`Category "${cat}" historical P(good)=${r.toFixed(2)}`);
  }

  const text = (input.advice + " " + input.context).toLowerCase();
  let goodHits = 0;
  let badHits = 0;
  for (const t of model.tokens.goodBias) {
    if (text.includes(t)) goodHits++;
  }
  for (const t of model.tokens.badBias) {
    if (text.includes(t)) badHits++;
  }
  if (goodHits || badHits) {
    const delta = (goodHits - badHits) * 0.04;
    score = Math.min(0.95, Math.max(0.05, score + delta));
    explanation.push(
      `Token bias: good-associated terms=${goodHits}, bad-associated=${badHits}`
    );
  }

  if (input.factors?.length) {
    for (const f of input.factors) {
      const key = `${f.key}:${f.value}`.slice(0, 80);
      const risk = model.riskFactors.find((r) => r.key === key);
      if (risk && risk.total >= 2 && risk.badRate >= 0.5) {
        score = Math.max(0.05, score - 0.12 * risk.badRate);
        explanation.push(
          `Risk factor ${key} historical badRate=${risk.badRate.toFixed(2)}`
        );
      }
    }
  }

  const predictedQuality =
    score >= 0.62 ? "likely_good" : score <= 0.38 ? "likely_bad" : "uncertain";

  return {
    predictedQuality,
    score,
    explanation,
    modelVersion: model.version,
  };
}

/** Export supervised pairs for external fine-tuning */
export async function exportTrainingJsonl(): Promise<{
  path: string;
  count: number;
  lines: string[];
}> {
  if (!records.length) await loadLedger();
  const pairs = records.filter((r) => r.trainingEligible && r.outcome);
  const lines = pairs.map((r) =>
    JSON.stringify({
      id: r.id,
      advisedAt: r.advisedAt,
      labeledAt: r.outcome!.labeledAt,
      label: r.outcome!.label,
      messages: [
        {
          role: "system",
          content:
            "You are HelixaraAI. Give defensive, ROE-aware advice. Prefer patterns that historically led to good outcomes.",
        },
        {
          role: "user",
          content: `Context:\n${r.context}\n\nExplainability was:\n${r.explainability.rationale}`,
        },
        {
          role: "assistant",
          content: r.advice,
        },
        {
          role: "user",
          content: `Outcome label: ${r.outcome!.label}. What happened: ${r.outcome!.whatHappened}`,
        },
      ],
      meta: {
        category: r.category,
        confidence: r.explainability.confidence,
        method: r.explainability.method,
        factors: r.explainability.factors,
      },
    })
  );

  const outPath = path.join(dataDir(), `train-${Date.now()}.jsonl`);
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(outPath, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");

  return { path: outPath, count: lines.length, lines: lines.slice(0, 5) };
}

export function ledgerStats() {
  const labeled = records.filter((r) => r.outcome);
  return {
    total: records.length,
    unlabeled: records.length - labeled.length,
    good: labeled.filter((r) => r.outcome!.label === "good").length,
    bad: labeled.filter((r) => r.outcome!.label === "bad").length,
    mixed: labeled.filter((r) => r.outcome!.label === "mixed").length,
    model: model
      ? { version: model.version, trainedAt: model.trainedAt, sampleCount: model.sampleCount }
      : null,
  };
}
