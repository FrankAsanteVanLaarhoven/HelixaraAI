# Bug bounty — search, find, restore

HelixaraAI bounty capabilities find configuration/security bugs on **in-scope** systems under a program ROE, then guide **restore** (remediation + health verify).

## Not included

- Unauthorized scanning of arbitrary internet systems  
- Exploit payload generation or account takeover tooling  
- Automatic destructive “fix any system” remote control  

## Flow

1. **Create program** — engagement id, legal basis, in-scope hosts  
2. **Find bugs** — safe surface checks against an in-scope target  
3. **Triage** finding statuses  
4. **Restore** — guided steps  
5. **Health probe** — confirm service responds after change  
6. **Complete** — mark finding verified  

## Checks

HTTP security headers, TLS/HTTP posture, DNS, CORS hints, cookie flags, info disclosure headers, robots surface, tech fingerprint, open-redirect heuristics.

## UI / API

- Console: `/console/bounty`  
- API: `/api/v1/bounty`  
