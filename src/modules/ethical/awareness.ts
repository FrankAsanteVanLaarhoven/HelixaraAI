/**
 * Phishing / SMS awareness simulation — ethical training only.
 * No live hosting, no credential capture, no SMS send/spoof.
 */

import { uid } from "@/lib/utils";
import { HARD_BLOCKS, requireEthicalUsage } from "@/modules/ethical/usage";

export type AwarenessChannel = "email_sim" | "sms_sim";

export interface AwarenessTemplate {
  id: string;
  channel: AwarenessChannel;
  name: string;
  /** Always watermarked simulation content */
  body: string;
  learningObjectives: string[];
  liveSend: false;
  spoof: false;
}

export interface AwarenessExercise {
  id: string;
  templateId: string;
  title: string;
  audienceNote: string;
  engagementId?: string;
  status: "draft" | "preview" | "closed";
  createdAt: string;
  previewHtml: string;
  warnings: string[];
}

const TEMPLATES: AwarenessTemplate[] = [
  {
    id: "phish-package",
    channel: "email_sim",
    name: "Fake package delivery (training)",
    body: "[SIMULATION — DO NOT SEND] Your package is held. Click the training link to learn how to spot fake trackers.",
    learningObjectives: [
      "Hover links before click",
      "Verify sender domain",
      "Report via org channel",
    ],
    liveSend: false,
    spoof: false,
  },
  {
    id: "phish-payroll",
    channel: "email_sim",
    name: "Payroll update (training)",
    body: "[SIMULATION — DO NOT SEND] HR asks to re-enter bank details on an external form — this is a training example of business email compromise.",
    learningObjectives: [
      "Out-of-band verify payroll changes",
      "Never reuse SSO password on third-party forms",
    ],
    liveSend: false,
    spoof: false,
  },
  {
    id: "sms-bank",
    channel: "sms_sim",
    name: "Bank OTP lure (training)",
    body: "[SIMULATION — NOT SENT] Bank: unusual login, reply YES to confirm. Training shows why reply-based SMS is risky.",
    learningObjectives: [
      "Banks do not ask for OTP via reply SMS",
      "Use official app only",
    ],
    liveSend: false,
    spoof: false,
  },
  {
    id: "sms-delivery",
    channel: "sms_sim",
    name: "Delivery fee lure (training)",
    body: "[SIMULATION — NOT SENT] Pay £1.99 customs fee: http://training.invalid/pay — example of smishing URL hygiene.",
    learningObjectives: ["Check short-link destinations", "No payment via cold SMS"],
    liveSend: false,
    spoof: false,
  },
];

const exercises: AwarenessExercise[] = [];

export function listAwareness() {
  return {
    gate: requireEthicalUsage(),
    templates: TEMPLATES,
    exercises: exercises.slice(0, 40),
    policy: {
      livePhishing: false,
      smsSpoof: false,
      liveSend: false,
      messages: [HARD_BLOCKS.phishingLive, HARD_BLOCKS.smsSpoof],
    },
  };
}

export function createAwarenessExercise(input: {
  templateId: string;
  title: string;
  audienceNote: string;
  engagementId?: string;
  /** Must be false — API rejects true */
  liveSend?: boolean;
  spoofSender?: boolean;
}) {
  const gate = requireEthicalUsage();
  if (!gate.ok) return gate;

  if (input.liveSend || input.spoofSender) {
    return {
      ok: false as const,
      reason: input.spoofSender ? HARD_BLOCKS.smsSpoof : HARD_BLOCKS.phishingLive,
    };
  }

  const tpl = TEMPLATES.find((t) => t.id === input.templateId);
  if (!tpl) return { ok: false as const, reason: "unknown template" };

  const previewHtml = [
    `<div style="border:2px dashed #f5b942;padding:12px;font-family:sans-serif">`,
    `<strong style="color:#b45309">SIMULATION ONLY — ETHICAL TRAINING</strong>`,
    `<p>${tpl.name}</p>`,
    `<p>${tpl.body}</p>`,
    `<p><em>Channel: ${tpl.channel} · liveSend=false · spoof=false</em></p>`,
    `<p>Audience note: ${input.audienceNote.slice(0, 400)}</p>`,
    `</div>`,
  ].join("");

  const ex: AwarenessExercise = {
    id: uid("awx"),
    templateId: tpl.id,
    title: input.title.slice(0, 160),
    audienceNote: input.audienceNote.slice(0, 500),
    engagementId: input.engagementId,
    status: "preview",
    createdAt: new Date().toISOString(),
    previewHtml,
    warnings: [
      HARD_BLOCKS.phishingLive,
      HARD_BLOCKS.smsSpoof,
      "Do not copy simulation content to real mail/SMS gateways.",
    ],
  };
  exercises.unshift(ex);
  return { ok: true as const, exercise: ex };
}
