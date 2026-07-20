/**
 * Consequence-aware advisor: produces advice with full explainability,
 * timestamps everything, and consults the trained local model.
 */

import { completeLLM, type LLMProviderId } from "@/modules/llm/providers";
import { getPrivacyMode } from "@/modules/os/privacy";
import {
  recordAdvice,
  scoreAdviceDraft,
  getConsequenceModel,
  type ExplainabilityBlock,
} from "@/modules/consequence/ledger";

export async function adviseWithConsequences(input: {
  context: string;
  question: string;
  category?: string;
  operatorId?: string;
  engagementId?: string;
  provider?: LLMProviderId | "auto";
  tags?: string[];
}): Promise<{
  adviceId: string;
  advice: string;
  advisedAt: string;
  explainability: ExplainabilityBlock;
  consequenceScore: ReturnType<typeof scoreAdviceDraft>;
  provider: string;
  model: string;
}> {
  const privacyMode = getPrivacyMode();
  const category = input.category || "general";
  const prior = getConsequenceModel();

  const system = [
    "You are HelixaraAI Consequence Advisor.",
    "Give authorised defensive security advice only. No malware, phishing, SMS spoof, or deauth attacks.",
    "Be concrete. After your advice, the operator will record real-world outcomes for training.",
    prior && prior.sampleCount >= 3
      ? `Historical consequence signals: good-associated terms≈${prior.tokens.goodBias.slice(0, 8).join(", ")}; avoid patterns linked to bad outcomes≈${prior.tokens.badBias.slice(0, 8).join(", ")}.`
      : "Few labeled outcomes yet — be conservative and explain uncertainty.",
    `Privacy mode: ${privacyMode}.`,
  ].join("\n");

  const llm = await completeLLM({
    provider: input.provider === "auto" ? undefined : input.provider,
    purpose: "agent_plan",
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Category: ${category}\n\nSituation:\n${input.context}\n\nQuestion:\n${input.question}\n\nRespond with actionable advice and a short "Why" section.`,
      },
    ],
  });

  const factors = [
    { key: "privacy_mode", value: privacyMode, weight: 0.2 },
    { key: "category", value: category, weight: 0.3 },
    {
      key: "provider",
      value: llm.provider,
      weight: 0.1,
    },
    {
      key: "has_trained_model",
      value: prior && prior.sampleCount >= 3 ? "yes" : "no",
      weight: 0.2,
    },
  ];

  const consequenceScore = scoreAdviceDraft({
    context: input.context + "\n" + input.question,
    advice: llm.content,
    category,
    factors,
  });

  const explainability: ExplainabilityBlock = {
    rationale: [
      "Advice generated with consequence-aware routing.",
      consequenceScore.explanation.join(" "),
      llm.fallback ? "Used fallback/local path." : `Primary provider ${llm.provider}.`,
    ]
      .filter(Boolean)
      .join(" "),
    factors,
    sources: [
      "consequence.ledger",
      `llm.${llm.provider}`,
      prior ? `model:${prior.version}` : "model:untrained",
    ],
    method: `${llm.provider}/${llm.model}+consequence-scorer`,
    confidence: Math.min(
      0.95,
      Math.max(0.15, (llm.fallback ? 0.45 : 0.7) * 0.5 + consequenceScore.score * 0.5)
    ),
    privacyMode,
    alternatives: [
      "Escalate to human ROE owner before high-impact actions",
      "Collect more outcome labels to improve the local model",
    ],
  };

  const rec = await recordAdvice({
    context: `Q: ${input.question}\n\n${input.context}`,
    advice: llm.content,
    category,
    tags: input.tags || ["consequence-advisor"],
    operatorId: input.operatorId,
    engagementId: input.engagementId,
    explainability,
  });

  return {
    adviceId: rec.id,
    advice: llm.content,
    advisedAt: rec.advisedAt,
    explainability,
    consequenceScore,
    provider: llm.provider,
    model: llm.model,
  };
}
