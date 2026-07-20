/**
 * Ethical "kits" catalog — CVE awareness, detection signatures, remediation.
 * Does NOT generate weaponized exploits or shellcode.
 */

import { uid } from "@/lib/utils";
import { HARD_BLOCKS, requireEthicalUsage } from "@/modules/ethical/usage";
import { elevatedOrMessage } from "@/modules/ethical/gates";
import { requireElevatedCapability } from "@/modules/ethical/gates";

export type KitCategory =
  | "cve_awareness"
  | "detection_signature"
  | "remediation"
  | "payload_lab_placeholder";

export interface KitItem {
  id: string;
  category: KitCategory;
  name: string;
  summary: string;
  ethicalUse: string;
  techniques?: string[];
  /** Detection / blue guidance only */
  detection?: string;
  remediation?: string;
  /** Always false for live weaponization */
  liveWeaponization: false;
  blockedNote?: string;
}

const KITS: KitItem[] = [
  {
    id: "kit-cve-2021-44228",
    category: "cve_awareness",
    name: "Log4Shell awareness (CVE-2021-44228)",
    summary: "Identify Log4j exposure class and patch posture — no PoC payload.",
    ethicalUse: "Inventory and remediate authorized estates under ROE.",
    techniques: ["T1190"],
    detection: "Outbound JNDI / ldap/rmi patterns in app logs; SCA inventory.",
    remediation: "Upgrade Log4j ≥ 2.17.1; remove JndiLookup; WAF virtual patch.",
    liveWeaponization: false,
  },
  {
    id: "kit-cve-2017-0144",
    category: "cve_awareness",
    name: "EternalBlue class awareness (CVE-2017-0144)",
    summary: "SMBv1 exposure checklist for lab/production hygiene.",
    ethicalUse: "Patch validation and segmentation review on owned networks.",
    techniques: ["T1210"],
    detection: "SMBv1 traffic; missing MS17-010; lateral movement analytics.",
    remediation: "Disable SMBv1; apply security updates; network segmentation.",
    liveWeaponization: false,
  },
  {
    id: "kit-det-webshell",
    category: "detection_signature",
    name: "Web shell behavioral detections",
    summary: "Blue-team detection ideas for anomalous script interpreters under web roots.",
    ethicalUse: "Detection engineering and purple validation in lab.",
    techniques: ["T1505.003"],
    detection: "Rare process trees from w3wp/nginx; unexpected .aspx/.php writes.",
    remediation: "Immutable deploy; FIM; least privilege app pools.",
    liveWeaponization: false,
  },
  {
    id: "kit-det-credential",
    category: "detection_signature",
    name: "Credential dumping indicators (host)",
    summary: "Host telemetry patterns associated with LSASS access attempts.",
    ethicalUse: "EDR rule tuning on authorized endpoints.",
    techniques: ["T1003"],
    detection: "Handle access to lsass.exe; suspicious mimikatz-like CLI args (name match only).",
    remediation: "Credential Guard; LSA protection; privileged access workstations.",
    liveWeaponization: false,
  },
  {
    id: "kit-rem-phishing",
    category: "remediation",
    name: "Phishing resilience controls",
    summary: "DMARC/DKIM/SPF, M365/Google safe links, user reporting workflow.",
    ethicalUse: "Harden mail path after authorized awareness exercises.",
    techniques: ["T1566"],
    remediation: "p=reject DMARC; quarantine policies; report-phish button; training.",
    liveWeaponization: false,
  },
  {
    id: "kit-payload-blocked",
    category: "payload_lab_placeholder",
    name: "Payload / exploit kit (blocked)",
    summary: "Placeholder for enterprise exploit kits — permanently non-generative.",
    ethicalUse: "Use vendor lab tools under separate license + ROE; not inside Helixara.",
    liveWeaponization: false,
    blockedNote: HARD_BLOCKS.exploitLive,
  },
];

const customNotes: { id: string; kitId: string; note: string; ts: string }[] = [];

export async function listKits() {
  const elev = await elevatedOrMessage("exploitLive");
  return {
    gate: requireEthicalUsage(),
    items: KITS.map((k) =>
      k.category === "payload_lab_placeholder"
        ? {
            ...k,
            blockedNote: elev.allowed
              ? elev.message
              : HARD_BLOCKS.exploitLive,
            elevatedUnlocked: elev.allowed,
          }
        : k
    ),
    notes: customNotes.slice(0, 50),
    policy: {
      liveWeaponization: elev.allowed,
      exploitGeneration: elev.allowed,
      message: elev.message,
      dualControl: true,
      authorizers: ["owner", "superadmin"],
    },
  };
}

export async function addKitNote(kitId: string, note: string) {
  const gate = requireEthicalUsage();
  if (!gate.ok) return gate;
  if (!KITS.some((k) => k.id === kitId)) {
    return { ok: false as const, reason: "unknown kit" };
  }
  // Payload-like notes require elevated dual-control
  if (
    /\b(msfvenom|shellcode|reverse_tcp|powershell\s+-enc|base64\s*payload)\b/i.test(
      note
    )
  ) {
    const elev = await requireElevatedCapability("exploit_payload_live");
    if (!elev.ok) {
      return {
        ok: false as const,
        reason: elev.reason,
      };
    }
  }
  const row = {
    id: uid("kitn"),
    kitId,
    note: note.slice(0, 2000),
    ts: new Date().toISOString(),
  };
  customNotes.unshift(row);
  return { ok: true as const, note: row };
}
