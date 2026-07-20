/**
 * Live geospatial fusion — public production data sources:
 * - CelesTrak NORAD GP (TLE) groups used industry-wide (same public catalog SSA community uses)
 * - OpenSky Network ADS-B (global civil aviation)
 * - Digital twin registry for ops regions
 *
 * Note: Classified military feeds are NOT available publicly. HelixaraAI uses the same
 * public NORAD-derived element sets (via CelesTrak) that defense-adjacent research uses.
 */

import { emitEvent } from "@/modules/events/bus";
import { uid } from "@/lib/utils";
// twins runtime is loaded dynamically to avoid circular init

export interface LiveEntity {
  id: string;
  kind: "satellite" | "flight" | "ops" | "twin" | "airport" | "alert";
  label: string;
  lat: number;
  lon: number;
  altKm?: number;
  meta: Record<string, string | number | boolean>;
  source: string;
  ts: string;
}

export interface LiveSnapshot {
  generatedAt: string;
  sources: { id: string; status: "ok" | "degraded" | "error"; detail: string }[];
  entities: LiveEntity[];
  regions: { id: string; name: string; lat: number; lon: number; zoom: number }[];
  benchmarks: { name: string; value: string; industry: string }[];
}

/** Approximate SGP4-lite: convert TLE mean motion to rough lat/lon for viz */
function roughPositionFromTle(
  line1: string,
  line2: string,
  seed: number
): { lat: number; lon: number; altKm: number } {
  // Mean motion (rev/day) is cols 53-63 on line 2
  const n = parseFloat(line2.slice(52, 63)) || 15;
  const inclination = parseFloat(line2.slice(8, 16)) || 51;
  const periodMin = 1440 / n;
  const t = Date.now() / 60000 + seed * 17;
  const phase = (t / periodMin) * Math.PI * 2;
  const lat = Math.sin(phase) * Math.min(inclination, 80) * 0.9;
  const lon = ((((t / periodMin) * 360 + seed * 40) % 360) + 360) % 360 - 180;
  // rough altitude from period (circular orbit approx)
  const mu = 398600.4418;
  const earthR = 6371;
  const periodSec = periodMin * 60;
  const a = Math.pow((mu * periodSec * periodSec) / (4 * Math.PI * Math.PI), 1 / 3);
  const altKm = Math.max(200, a - earthR);
  return { lat, lon, altKm };
  // line1 unused intentionally for lite viz
  void line1;
}

function parseTleText(text: string): { name: string; l1: string; l2: string }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: { name: string; l1: string; l2: string }[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (l1?.startsWith("1 ") && l2?.startsWith("2 ")) {
      out.push({ name, l1, l2 });
    }
  }
  return out;
}

async function fetchCelestrakGroup(
  group: string
): Promise<{ name: string; l1: string; l2: string }[]> {
  // Industry-standard public NORAD GP mirrors (same catalog family SSA tools use)
  const urls = [
    `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`,
    `https://celestrak.org/NORAD/elements/${encodeURIComponent(group)}.txt`,
  ];
  let lastErr = "unknown";
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "HelixaraAI/0.2 (+authorized research)",
          Accept: "text/plain,*/*",
        },
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      const text = await res.text();
      if (text.includes("Invalid") || text.length < 50) {
        lastErr = "empty/invalid body";
        continue;
      }
      const parsed = parseTleText(text);
      if (parsed.length) return parsed;
      lastErr = "parse empty";
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "fetch error";
    }
  }
  throw new Error(`CelesTrak ${group}: ${lastErr}`);
}

/** Fallback public satellites when CelesTrak is rate-limited / blocked */
async function fetchSatelliteFallbacks(): Promise<LiveEntity[]> {
  const entities: LiveEntity[] = [];
  const now = new Date().toISOString();

  // Live ISS position (public, reliable)
  try {
    const res = await fetch("http://api.open-notify.org/iss-now.json", {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        iss_position?: { latitude: string; longitude: string };
      };
      const lat = Number(data.iss_position?.latitude);
      const lon = Number(data.iss_position?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        entities.push({
          id: "sat-iss-live",
          kind: "satellite",
          label: "ISS (ZARYA) · live",
          lat,
          lon,
          altKm: 420,
          meta: { group: "stations", catalog: "open-notify", public: true },
          source: "open-notify",
          ts: now,
        });
      }
    }
  } catch {
    /* continue */
  }

  // Public TLE API — popular catalog objects
  const noradIds = [
    { id: 25544, name: "ISS (ZARYA)" },
    { id: 20580, name: "HST" },
    { id: 28654, name: "NOAA 18" },
    { id: 33591, name: "NOAA 19" },
    { id: 43013, name: "NOAA 20" },
    { id: 37849, name: "SUOMI NPP" },
    { id: 25994, name: "TERRA" },
    { id: 27424, name: "AQUA" },
    { id: 39084, name: "LANDSAT 8" },
    { id: 49260, name: "LANDSAT 9" },
    { id: 40697, name: "SENTINEL-1A" },
    { id: 42063, name: "SENTINEL-2A" },
  ];

  await Promise.all(
    noradIds.map(async (sat, i) => {
      try {
        const res = await fetch(
          `https://tle.ivanstanojevic.me/api/tle/${sat.id}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          name?: string;
          line1?: string;
          line2?: string;
        };
        if (!data.line1 || !data.line2) return;
        const pos = roughPositionFromTle(data.line1, data.line2, i + 3);
        entities.push({
          id: `sat-norad-${sat.id}`,
          kind: "satellite",
          label: data.name || sat.name,
          lat: pos.lat,
          lon: pos.lon,
          altKm: pos.altKm,
          meta: {
            group: "public-ssa",
            catalog: "tle-api/celestrak-sourced",
            norad: sat.id,
            public: true,
          },
          source: "tle-api",
          ts: now,
        });
      } catch {
        /* skip object */
      }
    })
  );

  return entities;
}

async function fetchOpenSky(): Promise<LiveEntity[]> {
  // OpenSky Network — free ADS-B state vectors (rate limited)
  const res = await fetch(
    "https://opensky-network.org/api/states/all?lamin=20&lomin=-130&lamax=55&lomax=30",
    {
      headers: { "User-Agent": "HelixaraAI/0.1" },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
  const data = (await res.json()) as {
    time?: number;
    states?: (string | number | boolean | null)[][];
  };
  const entities: LiveEntity[] = [];
  for (const s of (data.states || []).slice(0, 80)) {
    // icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_altitude, on_ground, velocity...
    const lat = s[6] as number | null;
    const lon = s[5] as number | null;
    if (lat == null || lon == null) continue;
    const callsign = String(s[1] || s[0] || "ACFT").trim();
    entities.push({
      id: `adsb-${s[0]}`,
      kind: "flight",
      label: callsign || String(s[0]),
      lat,
      lon,
      altKm: s[7] != null ? Number(s[7]) / 1000 : undefined,
      meta: {
        country: String(s[2] || ""),
        onGround: Boolean(s[8]),
        velocity: Number(s[9] || 0),
        source: "opensky",
      },
      source: "opensky-network",
      ts: new Date().toISOString(),
    });
  }
  return entities;
}

const REGIONS = [
  { id: "global", name: "Global", lat: 20, lon: 0, zoom: 1 },
  { id: "na", name: "North America", lat: 39, lon: -98, zoom: 3 },
  { id: "eu", name: "Europe", lat: 50, lon: 10, zoom: 3 },
  { id: "me", name: "Middle East", lat: 29, lon: 45, zoom: 4 },
  { id: "apac", name: "Asia-Pacific", lat: 20, lon: 105, zoom: 3 },
  { id: "af", name: "Africa", lat: 5, lon: 20, zoom: 3 },
  { id: "sa", name: "South America", lat: -15, lon: -60, zoom: 3 },
  { id: "oc", name: "Oceania", lat: -25, lon: 135, zoom: 3 },
  { id: "arctic", name: "Arctic", lat: 75, lon: 0, zoom: 3 },
  { id: "antarctic", name: "Antarctic", lat: -75, lon: 0, zoom: 3 },
];

// Major airline hub airports as visibility anchors
const AIRPORTS: LiveEntity[] = [
  ["ATL", 33.64, -84.42],
  ["PEK", 40.08, 116.58],
  ["DXB", 25.25, 55.36],
  ["LAX", 33.94, -118.4],
  ["HND", 35.55, 139.78],
  ["ORD", 41.97, -87.9],
  ["LHR", 51.47, -0.46],
  ["PVG", 31.14, 121.8],
  ["CDG", 49.01, 2.55],
  ["DFW", 32.9, -97.04],
  ["CAN", 23.39, 113.3],
  ["AMS", 52.31, 4.77],
  ["FRA", 50.03, 8.57],
  ["IST", 41.27, 28.75],
  ["SIN", 1.36, 103.99],
  ["ICN", 37.46, 126.44],
  ["DEN", 39.86, -104.67],
  ["BKK", 13.69, 100.75],
  ["JFK", 40.64, -73.78],
  ["MAD", 40.47, -3.56],
].map(([code, lat, lon]) => ({
  id: `apt-${code}`,
  kind: "airport" as const,
  label: `Hub ${code}`,
  lat: lat as number,
  lon: lon as number,
  meta: { hub: true },
  source: "iata-hubs",
  ts: new Date().toISOString(),
}));

export async function getLiveGeospatialSnapshot(): Promise<LiveSnapshot> {
  const sources: LiveSnapshot["sources"] = [];
  let twinEntities: LiveEntity[] = [];
  try {
    const { twinsAsLiveEntities } = await import("@/modules/twins/runtime");
    twinEntities = await twinsAsLiveEntities();
  } catch {
    twinEntities = [];
  }
  const entities: LiveEntity[] = [...twinEntities, ...AIRPORTS];
  const now = new Date().toISOString();
  sources.push({
    id: "digital-twins",
    status: twinEntities.length ? "ok" : "degraded",
    detail: `${twinEntities.length} live twins (poll + event sync)`,
  });

  // Satellite groups — public NORAD GP (CelesTrak) in parallel with tight timeouts
  const groups = [
    { id: "stations", limit: 10 },
    { id: "weather", limit: 12 },
    { id: "gps-ops", limit: 10 },
    { id: "starlink", limit: 15 },
  ];

  const groupResults = await Promise.all(
    groups.map(async (g) => {
      try {
        const tles = await fetchCelestrakGroup(g.id);
        return { g, tles: tles.slice(0, g.limit), error: null as string | null };
      } catch (e) {
        return {
          g,
          tles: [] as { name: string; l1: string; l2: string }[],
          error: e instanceof Error ? e.message : "failed",
        };
      }
    })
  );

  let satFromCelestrak = 0;
  for (const r of groupResults) {
    if (r.tles.length) {
      r.tles.forEach((t, i) => {
        const pos = roughPositionFromTle(t.l1, t.l2, i + r.g.id.length);
        entities.push({
          id: `sat-${r.g.id}-${i}-${t.name.slice(0, 12).replace(/\s+/g, "_")}`,
          kind: "satellite",
          label: t.name,
          lat: pos.lat,
          lon: pos.lon,
          altKm: pos.altKm,
          meta: {
            group: r.g.id,
            catalog: "celestrak-norad-gp",
            public: true,
          },
          source: "celestrak",
          ts: now,
        });
        satFromCelestrak++;
      });
      sources.push({
        id: `celestrak:${r.g.id}`,
        status: "ok",
        detail: `${r.tles.length} objects`,
      });
    } else {
      sources.push({
        id: `celestrak:${r.g.id}`,
        status: "error",
        detail: r.error || "unavailable",
      });
    }
  }

  // Always merge public fallbacks (ISS live + TLE API) for production resilience
  try {
    const fallbacks = await fetchSatelliteFallbacks();
    // Dedupe by label prefix if CelesTrak already filled
    for (const f of fallbacks) {
      if (
        satFromCelestrak > 0 &&
        f.id.startsWith("sat-norad-") &&
        entities.some((e) => e.label.includes(String(f.meta.norad || "")))
      ) {
        continue;
      }
      if (f.id === "sat-iss-live" && entities.some((e) => e.label.includes("ISS"))) {
        // prefer live ISS coordinates
        const idx = entities.findIndex((e) => e.label.includes("ISS"));
        if (idx >= 0) entities[idx] = f;
        else entities.push(f);
        continue;
      }
      entities.push(f);
    }
    sources.push({
      id: "satellite-fallbacks",
      status: fallbacks.length ? "ok" : "degraded",
      detail: `${fallbacks.length} from open-notify + tle-api`,
    });
  } catch (e) {
    sources.push({
      id: "satellite-fallbacks",
      status: "error",
      detail: e instanceof Error ? e.message : "fallback failed",
    });
  }

  try {
    const flights = await fetchOpenSky();
    entities.push(...flights);
    sources.push({
      id: "opensky",
      status: "ok",
      detail: `${flights.length} ADS-B states (regional bbox)`,
    });
    emitEvent({
      type: "flight.updated",
      source: "opensky",
      severity: "info",
      title: `ADS-B refresh · ${flights.length} aircraft`,
      payload: { count: flights.length },
    });
  } catch (e) {
    sources.push({
      id: "opensky",
      status: "degraded",
      detail: e instanceof Error ? e.message : "opensky unavailable",
    });
  }

  emitEvent({
    type: "satellite.updated",
    source: "geospatial.live",
    severity: "info",
    title: `Live fusion · ${entities.length} entities`,
    payload: {
      satellites: entities.filter((e) => e.kind === "satellite").length,
      flights: entities.filter((e) => e.kind === "flight").length,
    },
  });

  emitEvent({
    type: "twin.synced",
    source: "digital-twins",
    severity: "info",
    title: "Ops digital twins on globe",
    payload: { twins: twinEntities.length },
  });

  return {
    generatedAt: now,
    sources,
    entities,
    regions: REGIONS,
    benchmarks: [
      {
        name: "TLE source",
        value: "CelesTrak NORAD GP",
        industry: "Space domain awareness standard (public)",
      },
      {
        name: "ADS-B source",
        value: "OpenSky Network",
        industry: "Civil aviation research-grade",
      },
      {
        name: "Propagation",
        value: "SGP4-lite viz + TLE meta",
        industry: "Upgrade path: full SGP4/SDP4 wasm",
      },
      {
        name: "Digital twins",
        value: `${twinEntities.length} live SOC/edge twins`,
        industry: "Runtime poll + event-driven sync",
      },
      {
        name: "Regions",
        value: `${REGIONS.length} coverage presets`,
        industry: "Global + polar",
      },
    ],
  };
}

/** @deprecated use /api/v1/twins runtime */
export async function listDigitalTwins() {
  try {
    const { listTwins } = await import("@/modules/twins/runtime");
    return await listTwins();
  } catch {
    return [];
  }
}
