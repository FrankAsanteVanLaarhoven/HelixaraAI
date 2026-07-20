/**
 * ATT&CK technique library + authorized campaign planner (tabletop / recon mapping).
 * Not a live offensive exploit chain runner.
 */

import { uid } from "@/lib/utils";
import { HARD_BLOCKS, requireEthicalUsage } from "@/modules/ethical/usage";

export interface AttackTechnique {
  id: string;
  name: string;
  tactic: string;
  summary: string;
  /** Allowed Helixara execution mode */
  helixaraMode: "tabletop" | "recon_only" | "detection_only" | "blocked_offensive";
  detection: string;
  mitigation: string;
}

export interface CampaignPlan {
  id: string;
  name: string;
  engagementId: string;
  objective: string;
  techniqueIds: string[];
  status: "draft" | "tabletop" | "recon_mapped" | "closed";
  steps: { techniqueId: string; action: string; mode: string }[];
  createdAt: string;
  ethicalNote: string;
}

const TECHNIQUES: AttackTechnique[] = [
  {
    id: "T1595",
    name: "Active Scanning",
    tactic: "Reconnaissance",
    summary: "Scanning target infrastructure — only on authorized scopes.",
    helixaraMode: "recon_only",
    detection: "Scan telemetry / IDS port-scan rules",
    mitigation: "Rate limits, tarpits, expose only required services",
  },
  {
    id: "T1592",
    name: "Gather Victim Host Information",
    tactic: "Reconnaissance",
    summary: "Public OSINT on hosts and tech stacks.",
    helixaraMode: "recon_only",
    detection: "N/A public; watch for credential stuffing later",
    mitigation: "Minimize public fingerprints; security.txt",
  },
  {
    id: "T1566",
    name: "Phishing",
    tactic: "Initial Access",
    summary: "Awareness + mail controls. Live phishing disabled in Helixara.",
    helixaraMode: "tabletop",
    detection: "Secure email gateway; user reports",
    mitigation: "DMARC, training, MFA",
  },
  {
    id: "T1190",
    name: "Exploit Public-Facing Application",
    tactic: "Initial Access",
    summary: "Patch/vuln management focus — no exploit generation.",
    helixaraMode: "detection_only",
    detection: "WAF, RASP, exploit-kit IDS signatures",
    mitigation: "Patch SLAs; attack surface reduction",
  },
  {
    id: "T1110",
    name: "Brute Force",
    tactic: "Credential Access",
    summary: "Tabletop only unless separate authorized password-audit tool under ROE.",
    helixaraMode: "tabletop",
    detection: "Auth lockouts; impossible travel",
    mitigation: "MFA; lockout; passwordless",
  },
  {
    id: "T1078",
    name: "Valid Accounts",
    tactic: "Defense Evasion",
    summary: "Monitor privileged account use; no credential theft tooling.",
    helixaraMode: "detection_only",
    detection: "UEBA; privileged session recording",
    mitigation: "PAM; just-in-time admin",
  },
  {
    id: "T1048",
    name: "Exfiltration Over Alternative Protocol",
    tactic: "Exfiltration",
    summary: "Blue detection design for odd egress.",
    helixaraMode: "detection_only",
    detection: "DNS/ICMP tunneling analytics; DLP",
    mitigation: "Egress allowlists",
  },
  {
    id: "T1498",
    name: "Network Denial of Service",
    tactic: "Impact",
    summary: "Blocked as live action — tabletop resilience only.",
    helixaraMode: "blocked_offensive",
    detection: "Flow anomalies; scrubbing center alerts",
    mitigation: "CDN/DDoS protection; capacity planning",
  },
];

const campaigns: CampaignPlan[] = [];

export function listAttackLibrary() {
  return {
    gate: requireEthicalUsage(),
    techniques: TECHNIQUES,
    campaigns: campaigns.slice(0, 40),
    policy: {
      liveExploitChains: false,
      message:
        "Campaign runner is tabletop / recon-mapping / detection-engineering only. " +
        HARD_BLOCKS.exploitLive,
    },
  };
}

export function createCampaign(input: {
  name: string;
  engagementId: string;
  objective: string;
  techniqueIds: string[];
}) {
  const gate = requireEthicalUsage();
  if (!gate.ok) return gate;

  if (!input.engagementId.trim()) {
    return { ok: false as const, reason: "engagementId required (tie to ROE eng)" };
  }

  if (/\b(weaponiz|0day\s*sell|ransomware\s*deploy)\b/i.test(input.objective)) {
    return {
      ok: false as const,
      reason: "Objective not allowed under ethical hacking policy",
    };
  }

  const selected = TECHNIQUES.filter((t) => input.techniqueIds.includes(t.id));
  if (!selected.length) {
    return { ok: false as const, reason: "select at least one technique" };
  }

  const steps = selected.map((t) => {
    if (t.helixaraMode === "blocked_offensive") {
      return {
        techniqueId: t.id,
        action: `TABLETOP ONLY — ${t.name} not executed by Helixara`,
        mode: t.helixaraMode,
      };
    }
    if (t.helixaraMode === "recon_only") {
      return {
        techniqueId: t.id,
        action: `Map to Helixara recon/OSINT modules under ROE for ${t.name}`,
        mode: t.helixaraMode,
      };
    }
    if (t.helixaraMode === "detection_only") {
      return {
        techniqueId: t.id,
        action: `Design/validate detections: ${t.detection}`,
        mode: t.helixaraMode,
      };
    }
    return {
      techniqueId: t.id,
      action: `Tabletop discussion: ${t.summary}`,
      mode: t.helixaraMode,
    };
  });

  const plan: CampaignPlan = {
    id: uid("atkc"),
    name: input.name.slice(0, 160),
    engagementId: input.engagementId.trim(),
    objective: input.objective.slice(0, 2000),
    techniqueIds: selected.map((t) => t.id),
    status: selected.every((t) => t.helixaraMode === "recon_only")
      ? "recon_mapped"
      : "tabletop",
    steps,
    createdAt: new Date().toISOString(),
    ethicalNote:
      "Ethical hacking only. No live exploit chains, phishing send, or RF inject.",
  };
  campaigns.unshift(plan);
  return { ok: true as const, campaign: plan };
}
