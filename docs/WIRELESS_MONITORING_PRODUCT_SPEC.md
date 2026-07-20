# HelixaraAI Wi‑Fi Monitoring Product Spec  
**Wireless intrusion detection · authorised lab evaluation · defensive use only**

| | |
|---|---|
| **Product** | HelixaraAI Wireless Monitoring Module (WMM) |
| **Version** | 0.3.0-draft |
| **Classification** | Defensive security / lab evaluation |
| **Status** | Spec + implemented MVP modules |
| **Owners** | HelixaraAI product / security engineering |

---

## 1. Purpose and non-purpose

### 1.1 Purpose
Provide enterprises, authorised red/blue teams, and regulated labs with:

1. **Wireless intrusion detection (WIDS)** focused on **deauthentication and related 802.11 management abuse** against *monitored, owned, or explicitly in-scope* networks.  
2. **Authorised lab simulation** of Wi‑Fi disconnect scenarios for detection tuning, playbook drills, and training—**without** shipping offensive attack automation as a product feature.  
3. **Passive discovery and target *inventory* selection** for ROE-scoped assessments (scan + select AP/client metadata only).

### 1.2 Explicit non-purpose (out of scope)
HelixaraAI **does not** productise:

| Capability | Reason |
|------------|--------|
| Automated deauth / disassoc **attacks** against third parties | Computer Misuse Act 1990 (UK) and equivalent offences abroad |
| Evil twin / captive portal credential harvest | Fraud / unauthorised access facilitation |
| Handshake capture for offline cracking as a guided attack path | High dual-use harm |
| “Reveal hidden SSID by deauthing clients” offensive playbooks | Offensive wireless tradecraft |
| Bypass of lawful interception or carrier controls | Legal prohibition |

If a customer needs active wireless testing, they must use **separate, licensed tooling** under a **signed ROE**, not this module’s default feature set.

---

## 2. Legal and compliance posture

### 2.1 United Kingdom — Computer Misuse Act 1990 (CMA)
Operators and deployers must understand that the CMA creates offences including (plain language):

| Section (approx.) | Risk relevant to wireless |
|-------------------|---------------------------|
| **s1** Unauthorised access to computer material | Accessing or using systems/networks without authority |
| **s2** Unauthorised access with intent to commit further offences | Access as stepping stone |
| **s3** Unauthorised acts with intent to impair operation | **Jamming, flooding, deauth storms, deliberate disconnection of others’ devices** can be framed as impairment |
| **s3ZA** etc. (serious/unauthorised acts re: further offences / national security) | Aggravated impairment scenarios |

**Implication for HelixaraAI:**  
- **Detecting** deauth frames on a network you are authorised to monitor is **defensive**.  
- **Generating** deauth against networks/devices without authority is **offensive and potentially criminal**.  
- Lab simulation must run in **isolated RF environments** (shielded lab, dedicated test SSIDs, written authorisation).

Also consider (non-exhaustive, not legal advice):

- **Wireless Telegraphy Act 2006** — spectrum use and certain apparatus offences.  
- **Data Protection Act 2018 / UK GDPR** — MAC addresses and location can be personal data; minimise, retain with purpose, document lawful basis.  
- **Investigatory Powers** frameworks if state use is contemplated (out of commercial default scope).

### 2.2 Other jurisdictions (deploy-where-you-operate)
| Region | Notes (high level — obtain local counsel) |
|--------|------------------------------------------|
| **EU** | National cybercrime implementations of Budapest Convention; GDPR for identifiers |
| **US** | CFAA; state computer crime statutes; FCC rules on intentional interference |
| **UAE / GCC** | Often strict cybercrime and telecom licensing |
| **Any** | Corporate policy, sector regulators (finance, health, critical national infrastructure) |

**Rule:** Authority is **network-owner / written ROE**, not “I can hear the SSID.”

### 2.3 Mandatory operator attestations (product requirement)
Before: live RF monitoring of non-demo data, simulator “impairment inject” in lab mode, or export of packet-derived evidence:

| Field | Requirement |
|-------|-------------|
| `engagementId` | Unique ROE / change ticket / lab booking ID |
| `legalBasis` | Free-text: ownership, consent, or contract clause |
| `jurisdiction` | e.g. `UK`, `EU`, `US`, `OTHER` |
| `operatorId` | Authenticated user (SSO in production) |
| `scopeCidrOrSite` | Site / building / SSID list in scope |
| `expiresAt` | Attestation expiry; block after |

All actions **audit-logged** (immutable NDJSON / SIEM export).

---

## 3. Threat model (detection, not offence)

### 3.1 Primary threats detected
1. **Deauthentication flood** (broadcast or unicast) — DoS / force reconnect.  
2. **Disassociation flood** — similar impairment pattern.  
3. **Spoofed AP / BSSID anomalies** (stretch goal): management frames from unexpected sources.  
4. **Client disconnect storms** correlated with management frame spikes.

### 3.2 Assets protected
- Enterprise SSIDs (corp, guest, IoT segments under monitoring).  
- Critical client classes (VOIP, medical, industrial gateways) when tagged.  
- Lab evaluation baselines for blue-team detection quality.

### 3.3 Adversary assumptions
Capable RF attacker with commodity Wi‑Fi adapters; may spoof MACs; may use short bursts to evade naive thresholds.

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HelixaraAI Console (:3007)                │
│  /console/wireless  ·  /console/wids  ·  /console/lab-wifi   │
└───────────────┬─────────────────────┬───────────────────────┘
                │                     │
     ┌──────────▼──────────┐  ┌───────▼────────────┐
     │ Passive discovery    │  │ WIDS engine         │
     │ (airport/nmcli/demo)│  │ deauth event rules  │
     └──────────┬──────────┘  └───────┬────────────┘
                │                     │
     ┌──────────▼─────────────────────▼────────────┐
     │ Safeguards: ROE gate · rate limits · audit   │
     └──────────┬─────────────────────┬────────────┘
                │                     │
     ┌──────────▼──────────┐  ┌───────▼────────────┐
     │ Lab simulator       │  │ Event bus + SIEM    │
     │ disconnect scenarios│  │ NDJSON / webhooks   │
     └─────────────────────┘  └─────────────────────┘
```

### 4.1 Components

| Module | Path | Role |
|--------|------|------|
| Passive scan | `src/modules/wireless/scan.ts` | Nearby APs; select inventory target under ROE |
| WIDS | `src/modules/wireless/wids.ts` | Detect / score deauth-like events; alert |
| Lab simulator | `src/modules/wireless/lab_sim.ts` | Authorised synthetic disconnect scenarios |
| API | `/api/v1/wireless`, `/api/v1/wids`, `/api/v1/lab-wifi` | Control plane |
| Spec | this document | Compliance-facing product definition |

### 4.2 Data plane options (implementation stages)

| Stage | Ingest | Notes |
|-------|--------|--------|
| **MVP (shipped)** | Synthetic + rule engine + optional file inject of management-frame summaries | No kernel monitor dependency |
| **Stage 2** | Host sensor agent exporting **summaries** (counts/sec per BSSID), not full PCAP by default | Privacy minimisation |
| **Stage 3** | Optional PCAP/PCAPNG store for forensics under legal hold flag | Encryption at rest, retention policy |

---

## 5. Feature specifications

### 5.1 WIDS — deauthentication event detection

**Inputs (normalised event):**
```json
{
  "ts": "ISO-8601",
  "type": "deauth" | "disassoc" | "other_mgmt",
  "transmitter": "aa:bb:..",
  "receiver": "cc:dd:..|ff:ff:ff:ff:ff:ff",
  "bssid": "aa:bb:..",
  "reasonCode": 7,
  "channel": 36,
  "rssi": -61,
  "sensorId": "lab-sensor-01"
}
```

**Detection rules (MVP):**

| Rule ID | Condition | Severity |
|---------|-----------|----------|
| `DEAUTH-FLOOD-BCAST` | ≥ N deauth to broadcast per BSSID in window T | critical |
| `DEAUTH-FLOOD-UNICAST` | ≥ N deauth to same client in window T | high |
| `DISASSOC-FLOOD` | same for disassoc | high |
| `DEAUTH-BURST-MULTI-CLIENT` | deauth hits ≥ M distinct clients in window T | high |
| `BASELINE-ANOMALY` | rate > μ + kσ vs 1h baseline | medium |

**Outputs:**  
Alert object → event bus → UI → optional webhook (`WIDS_WEBHOOK_URL`).

**Safeguards:**  
- Sensor only accepted if `engagementId` valid.  
- No “counter-deauth” or auto-mitigation that transmits management frames.  
- Mitigation recommendations are **defensive**: enable PMF (802.11w) where supported, alert SOC, isolate segment, investigate rogue.

### 5.2 Lab simulator — authorised disconnect scenarios

**Purpose:** Blue-team drills and detector validation in **controlled RF / offline sim**.

**Scenarios (catalog):**

| Scenario ID | Description | Parameters |
|-------------|-------------|------------|
| `sim.deauth.broadcast_burst` | Short burst of synthetic broadcast deauth | duration, pps, bssid |
| `sim.deauth.targeted_client` | Unicast deauth against one lab client MAC | clientMac, count |
| `sim.disassoc.storm` | Disassoc flood pattern | window, count |
| `sim.benign.roam` | Legitimate roam (control) for false-positive check | clientMac |
| `sim.mixed.noise` | Benign traffic + low-rate deauth | ratio |

**Hard gates:**
1. `labMode === true` (env `HELIXARA_WIFI_LAB_MODE=1` **or** UI lab toggle + attestation).  
2. SSID/BSSID must be in **allowlist** (`HELIXARA_WIFI_LAB_ALLOWLIST` or default demo BSSIDs).  
3. Simulator emits **synthetic events into WIDS only** by default (`injectMode: "bus"`).  
4. `injectMode: "rf"` is **disabled in product** (always rejected) — prevents accidental weaponisation. RF inject stays a future optional plugin under separate legal review.

### 5.3 Passive monitoring / inventory
As implemented: scan APs; select network + optional client with ROE fields; audit; **no active attack actions**.

---

## 6. Safeguards summary (for ethics boards & reviewers)

| Control | Implementation |
|---------|----------------|
| Purpose limitation | Defensive WIDS + lab sim + passive inventory only |
| Attack surface removal | No deauth TX API; RF inject mode permanently off |
| Authorisation | engagementId + legalBasis + optional expiry |
| Lab isolation | Allowlisted BSSIDs; lab mode flag |
| Audit | Every scan, select, alert, sim run → NDJSON / events |
| Privacy | Prefer aggregates; MAC minimisation options; retention policy documented |
| Transparency | UI banners + this spec + in-app policy strings |
| Kill switch | `HELIXARA_WIFI_MODULE=off` disables routes |
| Dual-use review | Product changes that add TX/mgmt frame generation require security sign-off |

---

## 7. UX surfaces

| Route | Audience |
|-------|----------|
| `/console/wireless` | Passive scan + inventory select |
| `/console/wids` | Live alerts, rule status, sensor health |
| `/console/lab-wifi` | Run authorised sim scenarios; view inject log |

Banners on every page: **Controlled lab / defensive monitoring only · UK CMA & local law apply · No offensive deauth.**

---

## 8. KPIs (detection product, not attack success)

| KPI | Target |
|-----|--------|
| Deauth flood detection latency (sim) | p95 < 5s |
| False positive rate on `sim.benign.roam` | < 5% with default thresholds |
| Audit completeness | 100% of sim/scan/select/alert |
| Unauthorised RF TX attempts | 0 (hard blocked) |
| Operator attestation present | 100% for non-demo actions |

---

## 9. Threats to the product itself

| Risk | Mitigation |
|------|------------|
| Misuse as attack console | No TX APIs; legal banners; allowlists |
| Scope creep into “pentest auto-deauth” | Spec freeze; code review gate |
| PII leakage via MAC logs | Hash MACs option; short retention |
| Liability claims | Customer DPA + ROE templates; “not legal advice” disclaimer |

---

## 10. Roadmap

| Phase | Deliverable |
|-------|-------------|
| **Now (MVP)** | Spec, WIDS rules on synthetic/stream inject, lab sim → bus, UI, audits |
| **P1** | External sensor agent (summary JSON), SIEM CEF/ECS export |
| **P2** | 802.11w / PMF posture checks (config audit, not attack) |
| **P3** | Optional forensic PCAP under legal hold |
| **Not planned** | Offensive deauth automation, evil twin, handshake crack wizard |

---

## 11. Disclaimer

This document is a **product and engineering specification**. It is **not legal advice**. Deployers must obtain counsel for their jurisdiction and maintain written authorisation for any RF monitoring or lab impairment testing. Violations of the UK Computer Misuse Act 1990 or equivalent laws remain the responsibility of the operator and deploying organisation.

---

## 12. Acceptance criteria (MVP)

- [x] Written product spec with UK CMA framing and safeguards  
- [x] WIDS module detects deauth/disassoc flood patterns from event stream  
- [x] Lab simulator generates authorised scenarios into WIDS only (`injectMode: bus`)  
- [x] RF inject mode rejected  
- [x] ROE fields required for non-demo sensitive actions  
- [x] UI pages with explicit defensive banners  
- [x] Audit events for sim runs and alerts  
