# Operator workflow — agents (authorized)

HelixaraAI multi-agent missions use local **hermes-agent** when installed, plus Helixara crawl/OSINT specialists.

## What is integrated

| Capability | Helixara surface |
|------------|------------------|
| Multi-agent parallel work | Swarm + Kanban |
| Free models (Llama 3.1 / ensemble) | `hermes-native` provider |
| Parent → child handoff | Kanban `parentId` / `childrenIds` |
| Board: todo / ready / in progress / blocked / done | `/console/kanban` |
| Telegram mobile control | `/api/v1/telegram/webhook` + allowlisted user |
| OpenRouter (optional paid/free cloud) | `OPENROUTER_API_KEY` |
| Always-on worker | Deploy HelixaraAI on your VPS |

## What we refuse

- SMS sender spoofing / smishing
- Brand-impersonation phishing pages
- Covert geolocation of third parties without consent / warrant / ROE
- Unrestricted attack automation against arbitrary targets

Blocked by ethics gates in Kanban and Telegram handlers.

## Environment

```bash
# Local hermes-agent (Desktop tree)
export HERMES_AGENT_ROOT=$HOME/Desktop/hermes-agent-main
export HERMES_FREE_MODEL=free
npm run hermes:install
npm run hermes:bridge

# Free local weights
ollama pull llama3.1

# Optional cloud
# OPENROUTER_API_KEY=...
# OPENAI_API_KEY=...

# Optional external OpenClaw
# OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
```

## Launch mission

```bash
curl -s -X POST http://127.0.0.1:3007/api/v1/hermes \
  -H 'content-type: application/json' \
  -d '{"name":"Scope recon","objective":"Public DNS/HTTP posture","target":"example.com","provider":"hermes-native","freeModel":"free"}'
```

UI: `/console/missions`
