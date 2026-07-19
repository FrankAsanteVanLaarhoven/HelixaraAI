# Ethics & Legal Guardrails

## Purpose

HelixaraAI supports **lawful** open-source intelligence and **authorized** security assessment. It is not a general-purpose attack framework.

## Required operator practices

1. Maintain a signed Rules of Engagement (ROE) or statement of work for every non-public target.
2. Record `engagementId` and `legalBasis` on sensitive operations.
3. Prefer passive OSINT before active crawl.
4. Honor `robots.txt` unless a logged override is justified in the ROE.
5. Export audit NDJSON for case files and compliance reviews.

## Explicitly out of MVP scope

| Capability | Reason |
|------------|--------|
| Exploit / payload generation | Dual-use abuse risk; keep in separate licensed tooling if ever required |
| “Jailbreak / uncensored” LLM routing for attacks | Violates platform safety and enterprise policy norms |
| Default deauth / wireless cracking | Illegal without spectrum/lab authority |
| Automated dark-market scraping | Criminal facilitation risk; gated stub only |

## Dark-web channel

Activation requires:

- Scope `darkweb.authorized`
- Non-empty `engagementId` + `legalBasis`
- Optional: `HELIXARA_TOR_SOCKS` for future collectors

Even when activated, marketplace automation is not included by default.

## Data protection

- Do not scrape personal data without lawful basis (GDPR/UK DPA, etc.).
- Minimize retention of emails/phones extracted from pages.
- Treat audit logs as sensitive operational data.

## SSRF protection

Private/localhost targets are blocked unless `allowPrivateTargets` is explicitly set for isolated labs.
