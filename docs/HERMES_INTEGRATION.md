# hermes-agent integration (local)

HelixaraAI runs **hermes-agent** from a local Desktop install. We do **not** fork, branch, or contribute back to the upstream repository.

## Source

| Item | Value |
|------|--------|
| Local tree | `/Users/favl/Desktop/hermes-agent-main` (override with `HERMES_AGENT_ROOT`) |
| Upstream (reference only) | https://github.com/NousResearch/hermes-agent |
| Helixara venv | `.runtime/hermes-venv` (gitignored) |
| Helixara home | `.runtime/hermes-home` (gitignored) |
| Free models config | `integrations/hermes/cli-config.yaml` |
| Bridge | `integrations/hermes/bridge.py` |

## Install (once)

```bash
npm run hermes:install
# optional free model weights
ollama pull llama3.1
```

## Run bridge (recommended)

```bash
npm run hermes:bridge   # http://127.0.0.1:18790
```

## Free models registered

| Alias | Backend | Notes |
|-------|---------|--------|
| `free` | Ollama `llama3.1` | Default free model |
| `helixara-free` | Ollama `llama3.1` | Same stack |
| `llama31-free` | Ollama `llama3.1` | Explicit |
| `llama32-free` | Ollama `llama3.2` | Pull if needed |
| `ollama-free` | Ollama default | |
| `helixara-ensemble` | Offline plan | Always available |

## Wire-in points

- LLM provider id: `hermes-native`
- Swarm: `/api/v1/hermes` uses free native pass + commander
- Health: `modules.hermesNative`
- Chat: provider `hermes-native`
- Privacy vault allows: `hermes-native`, `ollama-llama31`, `hermes-router`

## Direct bridge API

```bash
curl -s http://127.0.0.1:18790/health
curl -s http://127.0.0.1:18790/v1/models
curl -s -X POST http://127.0.0.1:18790/v1/run \
  -H 'content-type: application/json' \
  -d '{"prompt":"Plan authorized OSINT for example.com","model":"free"}'
```

## Policy

- Local install only — no git remotes/branches against NousResearch.
- Helixara UI branding stays HelixaraAI (config branding: agent name Helixara Agent).
- Defensive / authorized ops only (ethics gates in Helixara modules).
