/**
 * Separate Red / Blue / Purple workspaces (coordination views).
 * Same ethics gate; different focus — not isolated offensive sandboxes with weapons.
 */

import { requireEthicalUsage } from "@/modules/ethical/usage";
import { listEngagements, listRoster } from "@/modules/redteam/store";
import { listAttackLibrary } from "@/modules/ethical/attack";
import { listPurpleBoard } from "@/modules/ethical/purple";
import { listAwareness } from "@/modules/ethical/awareness";
import { listKits } from "@/modules/ethical/kits";
import { listRfSim } from "@/modules/ethical/rfSim";

export type WorkspaceId = "red" | "blue" | "purple";

export function getWorkspace(id: WorkspaceId) {
  const gate = requireEthicalUsage();
  const base = {
    gate,
    workspace: id,
    ethicalHackingOnly: true,
    usageRequired: !gate.ok,
  };

  if (id === "red") {
    return {
      ...base,
      title: "Red workspace",
      focus: "Authorized recon, campaign tabletop, awareness SIM design",
      engagements: listEngagements(20),
      roster: listRoster().filter((m) =>
        ["lead", "recon", "osint", "scribe"].includes(m.role)
      ),
      campaigns: listAttackLibrary().campaigns,
      kits: listKits().items.filter((k) => k.category !== "detection_signature"),
      links: [
        "/console/redteam",
        "/console/redteam/attack",
        "/console/redteam/kits",
        "/console/redteam/awareness",
        "/console/missions",
      ],
    };
  }

  if (id === "blue") {
    return {
      ...base,
      title: "Blue workspace",
      focus: "Detection engineering, WIDS, telemetry, remediation kits",
      detections: listKits().items.filter(
        (k) =>
          k.category === "detection_signature" || k.category === "remediation"
      ),
      techniques: listAttackLibrary().techniques.filter(
        (t) =>
          t.helixaraMode === "detection_only" || t.helixaraMode === "tabletop"
      ),
      rfSim: listRfSim(),
      links: [
        "/console/wids",
        "/console/lab-wifi",
        "/console/telemetry",
        "/console/redteam/kits",
        "/console/redteam/rf-sim",
        "/console/audit",
      ],
    };
  }

  // purple
  const board = listPurpleBoard();
  return {
    ...base,
    title: "Purple workspace",
    focus: "Joint exercises — Red plans vs Blue detections",
    board,
    awareness: listAwareness().exercises,
    links: [
      "/console/redteam/purple",
      "/console/redteam",
      "/console/redteam/attack",
      "/console/wids",
    ],
  };
}

export function listWorkspaces() {
  return {
    gate: requireEthicalUsage(),
    workspaces: [
      { id: "red" as const, label: "Red", href: "/console/redteam/workspace?side=red" },
      { id: "blue" as const, label: "Blue", href: "/console/redteam/workspace?side=blue" },
      {
        id: "purple" as const,
        label: "Purple",
        href: "/console/redteam/workspace?side=purple",
      },
    ],
    policy:
      "Separate workspaces for ethical coordination. No isolated live-attack sandbox.",
  };
}
