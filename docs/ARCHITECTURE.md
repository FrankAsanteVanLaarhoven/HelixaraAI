# HelixaraAI Architecture

## System context

```
┌──────────────────────────────────────────────────────────┐
│                     Operator (browser)                     │
│                    HUD · God's Eye · Kanban                │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────┐
│                 HelixaraAI (Next.js)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Ethics  │ │  Crawl   │ │  OSINT   │ │   Agents    │  │
│  │ Guardrail│ │  Engine  │ │Collectors│ │Orchestrator │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
│       │            │            │              │         │
│  ┌────▼────────────▼────────────▼──────────────▼──────┐  │
│  │              Audit NDJSON + in-memory jobs           │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Geospatial feed adapters (demo/live)        │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────┬───────────────────────┘
                │                  │
        Public web / DoH / CT   Proxy / Tor (optional)
```

## Request path (scrape)

1. API validates body (Zod).
2. `evaluateScrapeTarget` applies scopes, SSRF, onion, path risk.
3. Audit deny/allow event.
4. Stealth session created (UA, language, viewport, proxy preference).
5. robots.txt check (default).
6. Human-like delay → fetch → Cheerio extract → optional same-origin deep map.
7. Success/error audit + result return (Markdown/JSON-ready).

## Mission path

Commander task → Recon (scrape) → OSINT → Analyst correlation → Scribe report.  
Each step is task-statused and artifacted for the mission record.

## Trust boundaries

- Untrusted: target web content, DNS/CT responses.
- Trusted: operator session (MVP demo operator), local audit disk.
- Semi-trusted: proxy providers (configure carefully).

## Scaling path

| Concern | MVP | Next |
|---------|-----|------|
| Job store | Memory | Redis / Postgres |
| Browser JS | Fetch+Cheerio | Playwright pool |
| Auth | Demo operator | OIDC + RBAC |
| Geo | Canvas globe | CesiumJS + 3D tiles |
| Quantum | Roadmap | PennyLane/Qiskit hybrid jobs |
