/**
 * Purple-team exercise board — coordinate Red plans with Blue detections.
 * Tabletop / detection validation; not a live attack orchestrator.
 */

import { uid } from "@/lib/utils";
import { requireEthicalUsage } from "@/modules/ethical/usage";

export type PurpleColumn =
  | "scenario"
  | "red_plan"
  | "blue_detect"
  | "validate"
  | "lessons"
  | "done";

export interface PurpleCard {
  id: string;
  title: string;
  detail: string;
  column: PurpleColumn;
  engagementId?: string;
  techniqueIds: string[];
  redOwner?: string;
  blueOwner?: string;
  createdAt: string;
  updatedAt: string;
}

const cards = new Map<string, PurpleCard>();

function seed() {
  if (cards.size) return;
  const now = new Date().toISOString();
  const seeds: Omit<PurpleCard, "id" | "createdAt" | "updatedAt">[] = [
    {
      title: "External recon tabletop",
      detail: "Red: public OSINT path. Blue: canary DNS + cert monitoring.",
      column: "scenario",
      techniqueIds: ["T1595", "T1592"],
      redOwner: "recon",
      blueOwner: "soc",
    },
    {
      title: "Phishing resilience drill",
      detail: "Awareness SIM only. Blue: measure report-phish rate.",
      column: "red_plan",
      techniqueIds: ["T1566"],
      redOwner: "lead",
      blueOwner: "secops",
    },
  ];
  for (const s of seeds) {
    const id = uid("prp");
    cards.set(id, { ...s, id, createdAt: now, updatedAt: now });
  }
}

export function listPurpleBoard() {
  seed();
  return {
    gate: requireEthicalUsage(),
    columns: [
      "scenario",
      "red_plan",
      "blue_detect",
      "validate",
      "lessons",
      "done",
    ] as PurpleColumn[],
    cards: [...cards.values()].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
    ),
    policy: {
      liveAttacks: false,
      message:
        "Purple board coordinates authorized exercises and detection validation. No live weaponization.",
    },
  };
}

export function upsertPurpleCard(input: {
  id?: string;
  title: string;
  detail?: string;
  column?: PurpleColumn;
  engagementId?: string;
  techniqueIds?: string[];
  redOwner?: string;
  blueOwner?: string;
}) {
  const gate = requireEthicalUsage();
  if (!gate.ok) return gate;
  seed();
  const id = input.id || uid("prp");
  const existing = cards.get(id);
  const now = new Date().toISOString();
  const card: PurpleCard = {
    id,
    title: input.title.slice(0, 200),
    detail: (input.detail || existing?.detail || "").slice(0, 2000),
    column: input.column || existing?.column || "scenario",
    engagementId: input.engagementId || existing?.engagementId,
    techniqueIds: input.techniqueIds || existing?.techniqueIds || [],
    redOwner: input.redOwner || existing?.redOwner,
    blueOwner: input.blueOwner || existing?.blueOwner,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  cards.set(id, card);
  return { ok: true as const, card };
}

export function movePurpleCard(id: string, column: PurpleColumn) {
  const gate = requireEthicalUsage();
  if (!gate.ok) return gate;
  const card = cards.get(id);
  if (!card) return { ok: false as const, reason: "not found" };
  card.column = column;
  card.updatedAt = new Date().toISOString();
  cards.set(id, card);
  return { ok: true as const, card };
}
