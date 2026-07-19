/**
 * Geospatial feed adapters — public / demo layers for the command globe.
 * Real enterprise deployments wire ADS-B, AIS, satellite ephemeris, etc.
 */

export interface GeoPoint {
  id: string;
  lat: number;
  lon: number;
  alt?: number;
  label: string;
  kind:
    | "ops"
    | "satellite"
    | "flight"
    | "vessel"
    | "sensor"
    | "threat"
    | "infra";
  meta?: Record<string, string | number | boolean>;
  ts: string;
}

export interface GeoLayer {
  id: string;
  name: string;
  description: string;
  points: GeoPoint[];
  live: boolean;
}

function now() {
  return new Date().toISOString();
}

/** Deterministic-ish demo motion from time */
function orbit(seed: number, radius = 20) {
  const t = Date.now() / 1000 + seed * 97;
  return {
    lat: Math.sin(t / 40 + seed) * radius,
    lon: ((t / 8 + seed * 40) % 360) - 180,
  };
}

export function getGeospatialSnapshot(): {
  layers: GeoLayer[];
  modes: string[];
  generatedAt: string;
} {
  const opsCenters: GeoPoint[] = [
    {
      id: "ops-lon",
      lat: 51.5074,
      lon: -0.1278,
      label: "HelixaraAI Node · London",
      kind: "ops",
      meta: { tier: "sovereign", status: "online" },
      ts: now(),
    },
    {
      id: "ops-iad",
      lat: 38.9072,
      lon: -77.0369,
      label: "HelixaraAI Node · Washington",
      kind: "ops",
      meta: { tier: "sovereign", status: "online" },
      ts: now(),
    },
    {
      id: "ops-ams",
      lat: 52.3676,
      lon: 4.9041,
      label: "HelixaraAI Node · Amsterdam",
      kind: "ops",
      meta: { tier: "edge", status: "online" },
      ts: now(),
    },
    {
      id: "ops-sgp",
      lat: 1.3521,
      lon: 103.8198,
      label: "HelixaraAI Node · Singapore",
      kind: "ops",
      meta: { tier: "edge", status: "online" },
      ts: now(),
    },
  ];

  const satellites: GeoPoint[] = Array.from({ length: 8 }).map((_, i) => {
    const p = orbit(i + 1, 55 + (i % 3) * 8);
    return {
      id: `sat-${i}`,
      lat: p.lat,
      lon: p.lon,
      alt: 420 + i * 30,
      label: `SAT-LM-${String(i + 1).padStart(2, "0")}`,
      kind: "satellite" as const,
      meta: { constellation: "demo", revisitMin: 90 + i * 5 },
      ts: now(),
    };
  });

  const flights: GeoPoint[] = [
    {
      id: "flt-1",
      ...(() => {
        const p = orbit(12, 35);
        return { lat: 40 + p.lat * 0.3, lon: -40 + p.lon * 0.2 };
      })(),
      alt: 11000,
      label: "ADS-B demo · transatlantic",
      kind: "flight",
      meta: { callsign: "LMORA1", source: "demo-feed" },
      ts: now(),
    },
    {
      id: "flt-2",
      lat: 25.2,
      lon: 55.3,
      alt: 9000,
      label: "ADS-B demo · Gulf corridor",
      kind: "flight",
      meta: { callsign: "LMORA7", source: "demo-feed" },
      ts: now(),
    },
  ];

  const vessels: GeoPoint[] = [
    {
      id: "ais-1",
      lat: 1.2,
      lon: 103.8,
      label: "AIS demo · Singapore Strait",
      kind: "vessel",
      meta: { mmsi: "000000001", source: "demo-feed" },
      ts: now(),
    },
    {
      id: "ais-2",
      lat: 51.95,
      lon: 4.05,
      label: "AIS demo · Rotterdam approaches",
      kind: "vessel",
      meta: { mmsi: "000000002", source: "demo-feed" },
      ts: now(),
    },
  ];

  const threats: GeoPoint[] = [
    {
      id: "thr-1",
      lat: 50.45,
      lon: 30.52,
      label: "Threat intel pin · infra cluster (demo)",
      kind: "threat",
      meta: { severity: "medium", source: "osint-correlation" },
      ts: now(),
    },
    {
      id: "thr-2",
      lat: 37.57,
      lon: 126.98,
      label: "Threat intel pin · C2 rumor (demo)",
      kind: "threat",
      meta: { severity: "low", source: "osint-correlation" },
      ts: now(),
    },
  ];

  const infra: GeoPoint[] = [
    {
      id: "infra-cf",
      lat: 37.7749,
      lon: -122.4194,
      label: "Edge / CDN presence (demo)",
      kind: "infra",
      meta: { provider: "demo" },
      ts: now(),
    },
  ];

  return {
    generatedAt: now(),
    modes: ["standard", "night", "crt", "thermal"],
    layers: [
      {
        id: "ops",
        name: "Ops Nodes",
        description: "Self-hosted HelixaraAI control planes",
        points: opsCenters,
        live: true,
      },
      {
        id: "satellites",
        name: "Satellite tracks (demo)",
        description: "Replace with live TLE / ephemeris feeds",
        points: satellites,
        live: true,
      },
      {
        id: "adsb",
        name: "ADS-B flights (demo)",
        description: "Wire OpenSky / commercial ADS-B for production",
        points: flights,
        live: true,
      },
      {
        id: "ais",
        name: "AIS maritime (demo)",
        description: "Wire AIS stream providers for production",
        points: vessels,
        live: true,
      },
      {
        id: "threats",
        name: "Threat correlation pins",
        description: "IOC geolocation from OSINT missions",
        points: threats,
        live: false,
      },
      {
        id: "infra",
        name: "Infrastructure",
        description: "CDN / cloud footprint annotations",
        points: infra,
        live: false,
      },
    ],
  };
}
