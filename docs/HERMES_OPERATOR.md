# Hermes-style operator workflow (authorized)

This document maps patterns from public Hermes agent tutorials into **HelixaraAI** without importing illegal tradecraft.

## What we adopt

| Pattern from Hermes videos | HelixaraAI implementation |
|----------------------------|---------------------------|
| Multi-agent parallel work | Hermes swarm + Kanban ready queue |
| Parent → child handoff | Kanban `parentId` / `childrenIds` |
| Board: todo / ready / in progress / blocked / done | `/console/kanban` |
| Telegram mobile control | `/api/v1/telegram/webhook` + allowlisted user |
| OpenRouter model routing | `OPENROUTER_API_KEY` + provider `openrouter` |
| Always-on cloud worker | Deploy HelixaraAI on your VPS (Docker/Node) |

## What we refuse

- SMS sender spoofing / smishing
- Brand-impersonation phishing pages (e.g. fake package tracking)
- Covert geolocation of third parties without consent / warrant / ROE
- Unrestricted “uncensored hacking team” automation against arbitrary targets

Those activities are illegal in most jurisdictions without explicit authorization and are **blocked by ethics gates** in Kanban and Telegram handlers.

## Legitimate use cases

- Authorized pentest recon (scope in ROE)
- Public OSINT enrichment
- Stealth crawl of **owned / permitted** assets
- Incident response research
- Security team task orchestration via Telegram for **operators only**

## Environment

```bash
# OpenRouter (same idea as Hermes cloud brain)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openrouter/auto   # or a free model id from openrouter.ai/models

# Telegram operator bot (BotFather)
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_ALLOWED_USER_ID=your_numeric_user_id

# Optional: external OpenClaw / Hermes gateway on another host
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
```

### Telegram webhook

1. Create bot with BotFather; copy token.
2. Get your user id (e.g. `@userinfobot`).
3. Set env vars above.
4. Point webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_PUBLIC_HOST/api/v1/telegram/webhook"
```

Commands: `/help` `/status` `/board` `/osint example.com` `/hermes example.com` `/task Title | prompt` `/run`

## External Hermes VPS

You may still run official Hermes Agent on a separate Hostinger/VPS instance for general automation. Point its tools at HelixaraAI APIs for **defensive** jobs only:

- `POST /api/v1/osint`
- `POST /api/v1/scrape`
- `POST /api/v1/hermes`
- `POST /api/v1/kanban`

Do not wire HelixaraAI to smishing or phishing skills.
