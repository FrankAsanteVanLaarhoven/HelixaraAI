# HelixaraAI

**Sovereign OSINT · Stealth Crawl · Mission Command**

Self-hosted cybersecurity command console for **authorized** operators: ethical OSINT, military-grade stealth web crawling, agentic recon missions, geospatial situational awareness, and immutable audit/ROE controls.

> **Authorized use only.** HelixaraAI is designed for lawful OSINT, defensive threat intel, and security testing under a documented Rules of Engagement. It does **not** ship exploit generators, default wireless attack tooling, or criminal dark-web automation.

---

## Market gap (why this exists)

| Tool | Strength | Gap HelixaraAI fills |
|------|----------|------------------|
| **Firecrawl** | Excellent AI-oriented scrape API | SaaS-centric; no ROE/audit console, no OSINT fusion, no geospatial mission HUD |
| **Maltego** | Graph OSINT transforms | Heavy desktop UX; weak modern stealth crawl + self-hosted agent swarm |
| **SpiderFoot** | Broad OSINT modules | Aging UI; limited enterprise audit/ROE first-class design |
| **Palantir-class** | Full fusion | Closed, expensive, not a sovereign self-host crawl+OSINT stack |

**HelixaraAI** unifies stealth crawl + ethical OSINT + agent missions + geospatial HUD + chain-of-custody in one self-hosted product surface.

---

## Quick start

```bash
cd workspace/HelixaraAI
npm install
npm run dev
```

Repo: [github.com/FrankAsanteVanLaarhoven/HelixaraAI](https://github.com/FrankAsanteVanLaarhoven/HelixaraAI)

Open [http://localhost:3000](http://localhost:3000) → **Enter Command Console**.

### Production build

```bash
npm run build
npm start
```

---

## Modules (MVP)

| Module | Path | Status |
|--------|------|--------|
| Command overview | `/console` | Live |
| Stealth Crawl Engine | `/console/scrape` | Live |
| Ethical OSINT | `/console/osint` | Live |
| Agentic missions | `/console/missions` | Live |
| Geospatial HUD | `/console/globe` | Live (demo feeds) |
| Audit / ROE trail | `/console/audit` | Live |
| Capability matrix | `/console/capabilities` | Live |

### API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/health` | GET | Liveness + module flags |
| `/api/v1/scrape` | POST/GET | Stealth scrape / recent jobs |
| `/api/v1/osint` | POST/GET | Public OSINT enrichment |
| `/api/v1/missions` | POST/GET | Agent pipeline missions |
| `/api/v1/geospatial` | GET | Globe layer snapshot |
| `/api/v1/audit` | GET | Audit events |
| `/api/v1/capabilities` | GET | Capability + gap matrix |

### Example scrape

```bash
curl -s -X POST http://localhost:3000/api/v1/scrape \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","tier":"elevated","deep":false}'
```

### Example OSINT

```bash
curl -s -X POST http://localhost:3000/api/v1/osint \
  -H 'content-type: application/json' \
  -d '{"query":"example.com"}'
```

---

## Architecture

```
src/
  app/                 # Next.js App Router (UI + API)
  components/console/  # HUD shell, globe, metrics
  lib/
    ethics/            # ROE scopes, SSRF blocks, dark-web gates
    crawl/             # stealth sessions, robots, extract, engine
    osint/             # DNS/DoH, CT, headers, gated dark-web stub
    agents/            # multi-role mission orchestrator
    geospatial/        # layer adapters (demo + prod hooks)
    audit/             # NDJSON chain-of-custody
```

**Stack:** Next.js 15 · TypeScript · Tailwind · Cheerio · Zod · Lucide

---

## Stealth vs Firecrawl (differentiation)

1. **Sovereign by default** — runs inside your perimeter; no mandatory SaaS egress of target content.
2. **Authorization scopes** — `scrape.surface`, `scrape.deep`, `darkweb.authorized`, etc.
3. **Engagement attestation** — deep ops require `engagementId` + `legalBasis`.
4. **Stealth tiers** — `standard` / `elevated` / `sovereign` with UA consistency, human jitter, proxy preference.
5. **Proxy / Tor hooks** — set `HELIXARA_PROXIES` JSON and optional `HELIXARA_TOR_SOCKS`.
6. **robots.txt default-on** — overrides must be explicit and audited.
7. **Mission + OSINT fusion** — scrape is one layer of a command console, not the whole product.
8. **Immutable audit** — `data/audit.ndjson` for compliance export.

---

## Ethics & dark web

- Dark-web (`.onion`) targets require `darkweb.authorized` scope **and** engagement attestation.
- Live marketplace scrapers are **not** shipped. Production can wire Tor SOCKS + approved indexers under legal review.
- Wireless recon / deauth tooling is **roadmap / lab-only** and intentionally excluded from MVP defaults.
- Agents produce recon, correlation, and reports — **not** exploit payloads.

See [docs/ETHICS_AND_LEGAL.md](./docs/ETHICS_AND_LEGAL.md).

---

## Environment

Copy `.env.example` → `.env.local` as needed:

| Variable | Purpose |
|----------|---------|
| `HELIXARA_PROXIES` | JSON array of proxy endpoints |
| `HELIXARA_TOR_SOCKS` | e.g. `socks5://127.0.0.1:9050` (integration hook) |
| `PORT` | Override listen port |

---

## Roadmap

- [ ] Hybrid quantum-inspired optimizers (crawl path / graph clustering) with classical surrogates  
- [ ] CesiumJS 3D globe upgrade + real ADS-B/AIS adapters  
- [ ] 4D multi-camera reconstruction adapters (COLMAP / 3DGS pipeline stubs)  
- [ ] Operator SSO (OIDC) + RBAC persistence  
- [ ] Playwright browser pool for heavy JS sites  
- [ ] Postgres mission store + SIEM export (CEF/ECS)  
- [ ] Authorized lab wireless recon module (no default offensive tools)

---

## Name

**HelixaraAI** (*Helix* + *Ara* + *AI*) — intertwined intel streams converging at a sovereign command altar. Product name is always **HelixaraAI** (not Lumora / Aegis / Nexus).

---

## License / disclaimer

Private project scaffold. Operators are solely responsible for compliance with local law and engagement scope. Not affiliated with any government agency.
