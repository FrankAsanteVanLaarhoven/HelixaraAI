# Helixara OS — local-first intelligence home

Inspired by the “private Hermes OS + Ollama” pattern: **own your intelligence**, one dashboard for agents, memory, models, and connections.

## Privacy modes

| Mode | Behavior |
|------|----------|
| **vault** | Local Ollama + hermes-router only. No OpenRouter/ChatGPT/OpenClaw. Best for client data, health, IP, offline. |
| **hybrid** (default) | Prefer Ollama; fall back to cloud with audit. |
| **connected** | Cloud providers allowed for max quality / web context. |

Set default: `HELIXARA_PRIVACY_MODE=vault|hybrid|connected`  
Toggle live: UI **Helixara OS** or `POST /api/v1/os` `{ "action":"set_mode","mode":"vault" }`.

## Ollama

```bash
# Install from https://ollama.com then:
ollama pull llama3.1
# or balanced alternatives
ollama pull qwen2.5:14b
```

Helixara probes `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`).

## OS surfaces

| Path | Purpose |
|------|---------|
| `/console/os` | OS home: modes, chat, connections, Ollama hub, goals, personas, skills, memory |
| `POST /api/v1/chat` | Operator chat with persona + privacy-aware routing |
| `GET/POST /api/v1/os` | State, notes, goals, personas, skills, docs |

## Ownership

- Memory: `data/os/state.json`
- Audit: `data/audit.ndjson`
- Models: on your machine via Ollama

No requirement for VPS. Cloud is optional, not the default brain.

## What this is not

- Not a jailbreak / “uncensored God Mode” gateway  
- Not malware generation tooling  
- Defensive ROE still applies to all agent and chat paths  
