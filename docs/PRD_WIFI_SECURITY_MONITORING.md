# Product Requirements Document  
## HelixaraAI Wi‑Fi Security Monitoring & Lab Evaluation

| Field | Value |
|-------|--------|
| **Product** | HelixaraAI Wireless Security Suite |
| **Document type** | PRD (requirements) |
| **Version** | 1.0 |
| **Status** | Approved for implementation direction |
| **Audience** | Product, engineering, security review, ethics board |
| **Related** | `WIRELESS_MONITORING_PRODUCT_SPEC.md` |

---

## 1. Problem statement

Organisations need visibility into **wireless denial and disruption patterns** (especially 802.11 deauthentication / disassociation abuse) and a **safe way to test** monitoring and response logic—without shipping a dual-use attack toolkit.

---

## 2. Product goals

1. **Detect** suspicious deauth patterns, unusual management-frame activity, and repeated client disconnects.  
2. **Respond** with alerts, device visibility, event timelines, and **defensive** mitigation guidance.  
3. **Evaluate** detectors via a **lab-only software harness** that **simulates** attack events **without transmitting** disruptive frames over the air.  
4. Enforce **authorised-use boundaries**, **audit logs**, **rate limits**, and **admin controls**.

---

## 3. Explicit non-goals (OUT OF SCOPE — permanent exclusions)

The following are **not** product features and **must not** ship in HelixaraAI default or “lab” builds without a separate legal/security program and written exception (not granted by this PRD):

| Excluded feature | Rationale |
|------------------|-----------|
| **Over-the-air packet injection** of management frames | Offensive / dual-use; legal risk (e.g. UK CMA impairment) |
| **Deauthentication / disassociation transmission** | Active disruption of stations/APs |
| **RF jamming** or intentional interference | Illegal / harmful in almost all jurisdictions |
| Evil twin / credential harvest portals | Fraud facilitation |
| Guided handshake cracking / PSK recovery attacks | Offensive cryptanalytic toolkit |
| “Reveal hidden SSID by deauthing clients” automation | Offensive tradecraft |

**Lab mode does not mean “attacks enabled.”**  
Lab mode means **software simulation + isolated test data + stricter gates**, still **zero OTA disruptive TX**.

---

## 4. In-scope capabilities

### 4.1 Detection & incident response (primary)

| Capability | Requirement |
|------------|-------------|
| Deauth flood detection | Broadcast and unicast rate rules with configurable windows |
| Disassoc flood detection | Same class of rules |
| Multi-client burst detection | Distinct receiver count thresholds |
| Unusual management-frame activity | Volume / baseline anomaly hooks |
| Repeated client disconnect correlation | Timeline + per-client counters |
| Alerting | In-app + event bus + optional webhook |
| Device visibility | APs (passive scan), clients (inventory/sim), BSSID-centric view |
| Event timelines | Ordered frame summaries + alert history |
| Mitigation guidance | Defensive only (PMF/802.11w, SOC escalate, rogue hunt)—**no counter-deauth** |

### 4.2 Lab-only test harness (secondary)

| Capability | Requirement |
|------------|-------------|
| Software inject | Synthetic frame **events** into WIDS bus only |
| Scenario catalog | Broadcast deauth, targeted deauth, disassoc storm, benign roam, mixed noise |
| Allowlist | Lab BSSIDs only |
| Attestation | engagementId + legalBasis + jurisdiction |
| Rate limits | Max runs/hour, max frames/run |
| Admin controls | Enable/disable lab module, kill switch, clear buffers |
| RF inject | **Always reject** |

### 4.3 Passive inventory (supporting)

| Capability | Requirement |
|------------|-------------|
| Nearby AP scan | OS tools when available; demo fallback |
| Select AP / optional client | Inventory for monitoring scope—not attack target queue |
| ROE gate | Required for locking selection |

---

## 5. Authorised-use boundaries

| Role | Allowed |
|------|---------|
| **Network owner / written ROE** | Monitor production SSIDs with sensors; alert; investigate |
| **Authorised lab** | Run software sims against allowlisted lab BSSIDs |
| **Everyone else** | Demo data only; no production sensor ingest without attestation |

Operators must affirm:

1. They have authority to monitor the named site/SSIDs, **or**  
2. They are running software-only simulation in a controlled evaluation context.

---

## 6. Legal note (UK and elsewhere) — not legal advice

- **UK Computer Misuse Act 1990**: unauthorised access and unauthorised acts impairing operation of computers/networks can be offences. **Deliberate wireless disruption** of systems without authority is high-risk.  
- **Detection and logging** on networks you are authorised to protect is the intended lawful use.  
- Other jurisdictions: CFAA (US), national cybercrime laws (EU), telecom/interference rules—**local counsel required**.  
- MAC addresses may be personal data under **UK GDPR**—minimise, purpose-limit, retain briefly.

---

## 7. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Audit | 100% of scan, select, frame ingest, sim run, admin action |
| Rate limits | Configurable; defaults prevent spam/DoS of own pipeline |
| Admin | Module kill switch; lab mode toggle; allowlist edit (env/API) |
| Privacy | Prefer aggregates; optional MAC hashing flag (future) |
| Safety | No code path that opens raw sockets for 802.11 TX in this product |
| UX | Persistent banners on all wireless pages stating exclusions |

---

## 8. Success metrics

| Metric | Target |
|--------|--------|
| Time-to-detect sim broadcast deauth | p95 &lt; 5s |
| False alert rate on benign roam sim | &lt; 5% default config |
| Offensive TX API surface | **0** endpoints |
| RF inject acceptance rate | **0%** |
| Audit coverage | 100% of control-plane actions |

---

## 9. User stories

1. As a **SOC analyst**, I receive an alert when deauth rates exceed thresholds so I can investigate.  
2. As a **detection engineer**, I run lab sims to validate rules without affecting real clients.  
3. As a **compliance reviewer**, I read a PRD that excludes offensive features and see audit trails.  
4. As an **admin**, I can disable the Wi‑Fi module or lab mode organisation-wide.

---

## 10. Acceptance criteria

- [x] PRD excludes OTA injection, deauth TX, jamming  
- [x] WIDS dashboard: alerts, devices, timelines, mitigation text  
- [x] Lab harness: software-only inject; RF rejected; rate limits; attestation  
- [x] Admin controls + audit  
- [x] Banners state lab/defensive boundaries and UK CMA awareness  

---

## 11. Open questions (explicitly deferred)

- External sensor agent protocol versioning  
- Long-term PCAP legal hold (optional, encrypted)  
- SSO-bound admin RBAC (production hardening)

---

**Document control:** Changes that re-introduce TX/injection/jamming require executive + legal + security sign-off and a **new PRD**—not a silent feature flag.
