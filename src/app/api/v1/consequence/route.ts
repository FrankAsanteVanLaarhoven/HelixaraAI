import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  exportTrainingJsonl,
  getAdvice,
  getConsequenceModel,
  labelOutcome,
  ledgerStats,
  listAdvice,
  loadLedger,
  recordAdvice,
  trainConsequenceModel,
} from "@/modules/consequence/ledger";
import { adviseWithConsequences } from "@/modules/consequence/advisor";
import { getPrivacyMode } from "@/modules/os/privacy";
import { appendAudit } from "@/lib/audit/logger";
import { demoOperator } from "@/lib/ethics/guardrails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await loadLedger();
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  if (id) {
    const a = getAdvice(id);
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ advice: a });
  }
  return NextResponse.json({
    stats: ledgerStats(),
    model: getConsequenceModel(),
    privacyMode: getPrivacyMode(),
    advice: listAdvice({
      limit: Number(sp.get("limit") || 50),
      unlabeledOnly: sp.get("unlabeled") === "1",
      label: (sp.get("label") as "good" | "bad" | "mixed" | "pending") || undefined,
    }),
    mustHave: {
      timestamps: true,
      explainability: true,
      outcomeFeedback: true,
      localTraining: true,
      exportJsonl: true,
    },
  });
}

const adviseSchema = z.object({
  action: z.literal("advise"),
  context: z.string().min(2).max(8000),
  question: z.string().min(2).max(4000),
  category: z.string().optional(),
  engagementId: z.string().optional(),
  provider: z
    .enum([
      "auto",
      "ollama-llama31",
      "openai-chatgpt",
      "openrouter",
      "hermes-router",
      "openclaw",
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
});

const labelSchema = z.object({
  action: z.literal("label"),
  adviceId: z.string().min(3),
  label: z.enum(["good", "bad", "mixed", "unknown"]),
  whatHappened: z.string().min(2).max(8000),
  impact: z.string().optional(),
  metrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const trainSchema = z.object({ action: z.literal("train") });
const exportSchema = z.object({ action: z.literal("export") });

const manualSchema = z.object({
  action: z.literal("record"),
  context: z.string().min(2),
  advice: z.string().min(2),
  category: z.string().optional(),
  rationale: z.string().min(2),
  factors: z
    .array(z.object({ key: z.string(), value: z.string(), weight: z.number().optional() }))
    .optional(),
  sources: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  engagementId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const operator = demoOperator();
  try {
    const json = await req.json();
    const action = json.action as string;

    if (action === "advise") {
      const parsed = adviseSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = await adviseWithConsequences({
        ...parsed.data,
        operatorId: operator.operatorId,
        engagementId: parsed.data.engagementId || operator.engagementId,
      });
      await appendAudit({
        operatorId: operator.operatorId,
        action: "consequence.advise",
        allowed: true,
        risk: "low",
        severity: "info",
        engagementId: parsed.data.engagementId || operator.engagementId,
        details: {
          adviceId: result.adviceId,
          score: result.consequenceScore.score,
          predicted: result.consequenceScore.predictedQuality,
        },
      });
      return NextResponse.json(result);
    }

    if (action === "label") {
      const parsed = labelSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const rec = await labelOutcome(parsed.data.adviceId, {
        label: parsed.data.label,
        whatHappened: parsed.data.whatHappened,
        impact: parsed.data.impact,
        metrics: parsed.data.metrics,
        labeledBy: operator.operatorId,
      });
      if (!rec) {
        return NextResponse.json({ error: "advice not found" }, { status: 404 });
      }
      await appendAudit({
        operatorId: operator.operatorId,
        action: "consequence.label",
        allowed: true,
        risk: "low",
        severity: "info",
        details: {
          adviceId: rec.id,
          label: parsed.data.label,
          advisedAt: rec.advisedAt,
          labeledAt: rec.outcome?.labeledAt,
        },
      });
      return NextResponse.json({ advice: rec, stats: ledgerStats() });
    }

    if (action === "train") {
      trainSchema.parse(json);
      const model = await trainConsequenceModel();
      await appendAudit({
        operatorId: operator.operatorId,
        action: "consequence.train",
        allowed: true,
        risk: "low",
        severity: "info",
        details: { version: model.version, sampleCount: model.sampleCount },
      });
      return NextResponse.json({ model, stats: ledgerStats() });
    }

    if (action === "export") {
      exportSchema.parse(json);
      const exp = await exportTrainingJsonl();
      return NextResponse.json({
        path: exp.path,
        count: exp.count,
        sample: exp.lines,
      });
    }

    if (action === "record") {
      const parsed = manualSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid body", issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const rec = await recordAdvice({
        context: parsed.data.context,
        advice: parsed.data.advice,
        category: parsed.data.category,
        operatorId: operator.operatorId,
        engagementId: parsed.data.engagementId || operator.engagementId,
        explainability: {
          rationale: parsed.data.rationale,
          factors: parsed.data.factors || [],
          sources: parsed.data.sources || ["manual"],
          method: "manual",
          confidence: parsed.data.confidence ?? 0.5,
          privacyMode: getPrivacyMode(),
        },
      });
      return NextResponse.json({ advice: rec });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "consequence failed" },
      { status: 500 }
    );
  }
}
