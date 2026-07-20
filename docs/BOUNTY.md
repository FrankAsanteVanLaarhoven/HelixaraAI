# Bug bounty — search, find, restore

HelixaraAI bounty capabilities find configuration/security bugs on **in-scope** systems under a program ROE, then guide **restore** (remediation + health verify).

## Not included

- Unauthorized scanning of arbitrary internet systems  
- Exploit payload generation or account takeover tooling  
- Automatic destructive “fix any system” remote control  

## Flow

1. **Create program** — engagement id, legal basis, in-scope **roots** (prefer `*.example.com`)  
2. **Discover all sites** — dynamic expansion via Certificate Transparency, common DNS prefixes, sitemaps  
3. **Scan all dynamically** — run find checks across the whole inventory (or single target)  
4. **Triage** finding statuses  
5. **Restore** — guided steps  
6. **Health probe** — confirm service responds after change  
7. **Complete** — mark finding verified  

## Dynamic inventory sources

| Source | Method |
|--------|--------|
| seed | Explicit program `inScope` entries |
| crt | crt.sh Certificate Transparency for `%.apex` |
| prefix | Common subdomain prefixes with DNS A lookup |
| sitemap | Hosts referenced from `https://apex/sitemap.xml` |

API: `POST { action: "discover" }` and `POST { action: "scan.all", rediscover: true }`

## Checks

HTTP security headers, TLS/HTTP posture, DNS, CORS hints, cookie flags, info disclosure headers, robots surface, tech fingerprint, open-redirect heuristics.

## UI / API

- Console: `/console/bounty`  
- API: `/api/v1/bounty`  
