/**
 * Separate Red / Blue / Purple workspaces (coordination views).
 */

import { requireEthicalUsage } from "@/modules/ethical/usage";
import { listEngagements, listRoster } from "@/modules/redteam/store";
import { listAttackLibrary } from "@/modules/ethical/attack";
import { listPurpleBoard } from "@/modules/ethical/purple";
import { listAwareness } from "@/modules/ethical/awareness";
import { listKits } from "@/modules/ethical/kits";
import { listRfSim } from "@/modules/ethical/rfSim";

export type WorkspaceId = "red" | "blue" | "purple";

export async function getWorkspace(id: WorkspaceId) {
  const gate = requireEthicalUsage();
  const base = {
    gate,
    workspace: id,
    ethicalHackingOnly: true,
    usageRequired: !gate.ok,
  };

  if (id === "red") {
    const attack = await listAttackLibrary();
    const kits = await listKits();
    return {
      ...base,
      title: "Red workspace",
      focus: "Authorized recon, campaign tabletop, awareness SIM design",
      engagements: listEngagements(20),
      roster: listRoster().filter((m) =>
        ["lead", "recon", "osint", "scribe"].includes(m.role)
      ),
      campaigns: attack.campaigns,
      kits: kits.items.filter((k) => k.category !== "detection_signature"),
      links: [
        "/console/redteam",
        "/console/redteam/attack",
        "/console/redteam/kits",
        "/console/redteam/awareness",
        "/console/missions",
        "/console/admin/elevated",
      ],
    };
  }

  if (id === "blue") {
    const kits = await listKits();
    const attack = await listAttackLibrary();
    const rf = await listRfSim();
    return {
      ...base,
      title: "Blue workspace",
      focus: "Detection engineering, WIDS, telemetry, remediation kits",
      detections: kits.items.filter(
        (k) =>
          k.category === "detection_signature" || k.category === "remediation"
      ),
      techniques: attack.techniques.filter(
        (t) =>
          t.helixaraMode === "detection_only" || t.helixaraMode === "tabletop"
      ),
      rfSim: rf,
      links: [
        "/console/wids",
        "/console/lab-wifi",
        "/console/telemetry",
        "/console/redteam/kits",
        "/console/redteam/rf-sim",
        "/console/audit",
        "/console/admin/elevated",
      ],
    };
  }

  const board = await listPurpleBoard();
  const awareness = await listAwareness();
  return {
    ...base,
    title: "Purple workspace",
    focus: "Joint exercises — Red plans vs Blue detections",
    board,
    awareness: awareness.exercises,
    links: [
      "/console/redteam/purple",
      "/console/redteam",
      "/console/redteam/attack",
      "/console/wids",
      "/console/admin/elevated",
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
      "Separate workspaces for ethical coordination. Elevated paths need owner+superadmin dual-control.",
  };
}
