"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/modules/theme/context";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  kind: string;
};

const KIND_COLOR: Record<string, string> = {
  ops: "#2ee6ff",
  twin: "#2ee6ff",
  satellite: "#9b8cff",
  flight: "#f5b942",
  vessel: "#3dff9a",
  threat: "#ff4d6a",
  infra: "#7f98b3",
  sensor: "#2ee6ff",
  airport: "#7f98b3",
};

/** Real basemap tiles — dark/light variants for app theme */
const TILES: Record<string, { url: string; attr: string }> = {
  standard: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  standard_light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  night: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  crt: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  thermal: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lon) <= 180
    );
    if (!valid.length) {
      map.setView([20, 0], 2);
      return;
    }
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lon], 5);
      return;
    }
    const bounds = L.latLngBounds(
      valid.map((p) => [p.lat, p.lon] as [number, number])
    );
    map.fitBounds(bounds.pad(0.25), { animate: true, maxZoom: 8 });
  }, [map, points]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

export function RealMap({
  points,
  mode = "standard",
  className,
}: {
  points: MapPoint[];
  mode?: string;
  className?: string;
}) {
  const { resolved } = useTheme();
  const tileKey =
    mode === "standard" && resolved === "light" ? "standard_light" : mode;
  const tile = TILES[tileKey] || TILES.standard;
  const validPoints = useMemo(
    () =>
      points.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lon) <= 180
      ),
    [points]
  );

  const center: [number, number] = validPoints.length
    ? [validPoints[0].lat, validPoints[0].lon]
    : [20, 0];

  return (
    <div
      className={className}
      style={{ height: "100%", width: "100%", minHeight: 280, position: "relative" }}
    >
      <MapContainer
        center={center}
        zoom={2}
        minZoom={1}
        maxZoom={18}
        scrollWheelZoom
        style={{
          height: "100%",
          width: "100%",
          background: "var(--lm-map-bg)",
        }}
        worldCopyJump
      >
        <TileLayer
          key={tile.url}
          attribution={tile.attr}
          url={tile.url}
          subdomains="abcd"
          maxZoom={20}
        />
        <FitBounds points={validPoints} />
        <InvalidateSize />
        {validPoints.map((p) => {
          const color = KIND_COLOR[p.kind] || "#2ee6ff";
          const radius =
            p.kind === "ops" || p.kind === "twin"
              ? 9
              : p.kind === "threat"
                ? 8
                : p.kind === "flight"
                  ? 6
                  : 7;
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.75,
                weight: 2,
                opacity: 0.95,
              }}
            >
              <Popup>
                <div style={{ fontSize: 12, minWidth: 140 }}>
                  <strong>{p.label}</strong>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    {p.kind} · {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 12,
          top: 12,
          zIndex: 1000,
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(46,230,255,0.85)",
          textShadow: "0 0 8px rgba(0,0,0,0.8)",
        }}
      >
        Live map · OSM/Carto · {mode} · {validPoints.length} pins
      </div>
    </div>
  );
}
