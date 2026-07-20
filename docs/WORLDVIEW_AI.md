# Worldview AI — video + physics grounded world model

## Purpose
Own a **Helixara world model** that is not only text-chat:

- **Video observations** (clips, cameras, logical sources)
- **Physics priors** (gravity, contact, elastic collision rollouts)
- **World state** (entities, velocities, consistency scores)
- **Train / export** for local fine-tunes (JSONL)

Complements **Consequence AI** (advice→outcome) with **scene→physics→narrative**.

## Pipeline
1. **Ingest** video observation (+ optional luminance series for motion energy)  
2. **Hypothesize** entities (seeded or CV adapter later)  
3. **Ground** with physics simulation rollout  
4. **Score** physics consistency  
5. **Narrate** (LLM under vault/hybrid policy)  
6. **Label** good/bad/mixed episode quality  
7. **Train** local priors + **export JSONL** for larger models  

## API
- `GET /api/v1/worldview`
- `POST` actions: `ingest` · `narrate` · `label` · `rollout` · `train` · `export`

## UI
`/console/worldview`

## Data
| Path | Content |
|------|---------|
| `data/worldview/episodes.ndjson` | Episodes |
| `data/worldview/model.json` | Trained priors |
| `data/worldview/train-*.jsonl` | Fine-tune export |

## Roadmap (honest)
| Now | Later |
|-----|--------|
| Physics engine + episode ledger | ffmpeg / OpenCV frame extract |
| Motion energy from samples | Optical flow / object trackers |
| Consistency scoring | COLMAP / 3DGS / NeRF adapters |
| JSONL export | Full video-language fine-tune jobs |

## Ethics
Defensive / recon / authorised lab scenes only. Same Helixara ROE as the rest of the console.
