# Platform production layer

## PWA
- Manifest: `/manifest.webmanifest`
- Service worker: `/sw.js` (shell-only; **never caches `/api/*` or secrets**)
- Icons: `/icons/icon-192.png`, `/icons/icon-512.png`
- Registered via `PwaRegister` in root layout

## SDK
```ts
import { HelixaraClient, getHelixaraClient } from "@/sdk";
// or package export helixaraai/sdk

const hx = getHelixaraClient();
await hx.health();
await hx.telemetryLive();
await hx.bountyScanAll(programId);
```
Tokens only via in-memory `getToken()` — not `localStorage`.

## WebRTC + WebGL
- UI: `/console/live`
- Signaling: `/api/v1/live/webrtc` (no-store, ephemeral SDP)
- `WebGLVideoView` — GPU texture from MediaStream / video
- `WebRTCLiveRoom` — host/join P2P streams (STUN); demo canvas if no camera

## Security / leakage
| Control | Behavior |
|---------|----------|
| CSP | Strict defaults; media/blob/ws for live |
| API cache | `private, no-store` always |
| SW | Blocks caching of `/api`, tokens, elevated |
| Redact | `src/lib/security/redact.ts` |
| COOP/CORP | same-origin / same-site |
| HSTS | production |

## Caching / scale
| Layer | Strategy |
|-------|----------|
| Runtime memory | `cacheWrap` / `cacheGet` — no secret keys |
| Platform CDN | Static immutable; APIs never shared |
| `GET /api/v1/platform/cache` | Stats + policy |

## Browse optimizations
- `compress: true`, package import optimize, font `display: swap`
- Prefetch DNS header, AVIF/WebP images
- Viewport + theme-color for installable UX
