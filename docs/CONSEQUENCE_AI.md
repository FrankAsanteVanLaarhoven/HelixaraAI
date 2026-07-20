# Consequence AI — must-have training loop

## Goal
Remove the limitation of “stateless” cloud advice: HelixaraAI **records every recommendation**, **explains it**, **timestamps advice and outcomes**, and **trains a local model** on what happened after good vs bad advice.

## Loop
1. **Advise** → `POST /api/v1/consequence` `{ "action":"advise", ... }`  
   - Stores `advisedAt`, full text, explainability block  
2. **Operate** in the real world / lab  
3. **Label outcome** → `{ "action":"label", "adviceId", "label":"good|bad|mixed", "whatHappened" }`  
   - Stores `labeledAt`, latency, narrative  
4. **Train** → `{ "action":"train" }`  
   - Updates local consequence model (`data/consequence/model.json`)  
5. **Export** → `{ "action":"export" }`  
   - JSONL for Ollama / LoRA fine-tunes  

## Explainability fields
- `rationale` — human-readable why  
- `factors[]` — key/value/weight  
- `sources[]` — modules consulted  
- `method` — provider/model path  
- `confidence` — 0–1  
- `alternatives[]` — other options  

## UI
`/console/consequence`

## Data plane
| Path | Content |
|------|---------|
| `data/consequence/ledger.ndjson` | Immutable-ish append log of advice |
| `data/consequence/model.json` | Trained snapshot |
| `data/consequence/train-*.jsonl` | Fine-tune export |

## Privacy
Respects Helixara OS vault mode when generating advice (local Ollama preferred). Outcome labels stay on-box.

## Not claimed
This is **not** automatic full foundation-model pretraining. It is a **must-have consequence layer**: logging, explainability, outcome supervision, local scoring, and export for your own model training pipeline.
