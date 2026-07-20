# Red Team + ethical hacking labs

HelixaraAI Red Team manages **ROE-scoped engagements** and ethical-hacking labs.

## Operator flow (engagements)

1. Create engagement (type + target + objective)  
2. Attest ROE  
3. Run recon cycle  
4. Review findings + report  
5. Close  

Offensive language in objectives is still blocked on the recon runner.

## Ethical labs (usage message required)

Every lab under `/console/redteam/*` requires typing:

`I ACCEPT ETHICAL HACKING ONLY`

| Lab | Path | What it does | Permanently disabled |
|-----|------|--------------|----------------------|
| Kits | `/console/redteam/kits` | CVE awareness, detection, remediation | Live exploit/payload generation |
| Awareness | `/console/redteam/awareness` | Phishing/SMS **SIM previews** | Live phishing host, SMS spoof/send |
| RF sim | `/console/redteam/rf-sim` | Software deauth events → WIDS | OTA deauth / RF inject / jam |
| ATT&CK | `/console/redteam/attack` | TTP library + tabletop/recon campaign plans | Live exploit chains |
| Purple | `/console/redteam/purple` | Red plan vs Blue detect board | Live attack orchestration |
| Workspaces | `/console/redteam/workspace` | Separate Red / Blue / Purple views | Isolated weaponized sandboxes |

## API

- Engagements: `/api/v1/redteam`  
- Ethical labs: `/api/v1/ethical?section=usage|kits|awareness|rf|attack|purple|workspace`

## Legal

Authorized ethical hacking and defensive security testing only. Operators must hold ROE/SOW for every target.
