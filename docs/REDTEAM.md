# Red Team module (ROE recon only)

HelixaraAI Red Team is **scoped engagement management** for authorized recon, public OSINT, lab observation, and reporting.

## Included

- Nav: `/console/redteam`
- API: `/api/v1/redteam`
- Roster (lead, recon, osint, analyst, scribe, observer)
- Engagement types: external recon, internal lab, web surface, wireless lab observe, reporting only
- ROE attestation gate before recon cycles
- Run path: OSINT → surface crawl → optional hermes swarm → report

## Explicitly excluded

- Exploit / payload kits
- Phishing / SMS spoof
- Deauth / RF inject / jamming
- ATT&CK campaign runners / offensive TTP libraries
- Purple-team exercise boards
- Separate Red vs Blue workspaces

## Operator flow

1. Create engagement (type + target + objective)
2. Attest ROE (id, legal basis, scope, expiry)
3. **Run recon cycle**
4. Review findings + report
5. Close engagement

All runs are audited. Offensive language in objectives is blocked.
