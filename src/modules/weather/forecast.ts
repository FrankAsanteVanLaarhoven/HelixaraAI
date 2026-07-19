/**
 * 7-day weather via Open-Meteo (no API key, production-usable free tier).
 */

import { emitEvent } from "@/modules/events/bus";

export interface DayForecast {
  date: string;
  tMaxC: number;
  tMinC: number;
  precipitationMm: number;
  weatherCode: number;
  windMaxKmh: number;
  summary: string;
}

export interface WeatherBundle {
  place: string;
  lat: number;
  lon: number;
  timezone: string;
  units: { temp: "C"; wind: "km/h"; precip: "mm" };
  current?: {
    tempC: number;
    windKmh: number;
    weatherCode: number;
    summary: string;
  };
  daily: DayForecast[];
  source: string;
  fetchedAt: string;
}

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  80: "Rain showers",
  95: "Thunderstorm",
};

function summarize(code: number) {
  return WMO[code] || WMO[Math.floor(code)] || `Code ${code}`;
}

export async function getSevenDayForecast(
  lat: number,
  lon: number,
  place = "Selected location"
): Promise<WeatherBundle> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&timezone=auto&forecast_days=7`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = (await res.json()) as {
    timezone?: string;
    current?: {
      temperature_2m: number;
      weather_code: number;
      wind_speed_10m: number;
    };
    daily?: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      wind_speed_10m_max: number[];
    };
  };

  const daily: DayForecast[] = (data.daily?.time || []).map((date, i) => ({
    date,
    tMaxC: data.daily!.temperature_2m_max[i],
    tMinC: data.daily!.temperature_2m_min[i],
    precipitationMm: data.daily!.precipitation_sum[i],
    weatherCode: data.daily!.weather_code[i],
    windMaxKmh: data.daily!.wind_speed_10m_max[i],
    summary: summarize(data.daily!.weather_code[i]),
  }));

  const bundle: WeatherBundle = {
    place,
    lat,
    lon,
    timezone: data.timezone || "UTC",
    units: { temp: "C", wind: "km/h", precip: "mm" },
    current: data.current
      ? {
          tempC: data.current.temperature_2m,
          windKmh: data.current.wind_speed_10m,
          weatherCode: data.current.weather_code,
          summary: summarize(data.current.weather_code),
        }
      : undefined,
    daily,
    source: "open-meteo",
    fetchedAt: new Date().toISOString(),
  };

  emitEvent({
    type: "weather.updated",
    source: "open-meteo",
    severity: "info",
    title: `7-day forecast · ${place}`,
    payload: { lat, lon, days: daily.length },
  });

  return bundle;
}

/** Capital / major city presets for global console */
export const WEATHER_CITIES: { id: string; place: string; lat: number; lon: number }[] = [
  { id: "lon", place: "London", lat: 51.5, lon: -0.12 },
  { id: "nyc", place: "New York", lat: 40.71, lon: -74.0 },
  { id: "tyo", place: "Tokyo", lat: 35.68, lon: 139.69 },
  { id: "dxb", place: "Dubai", lat: 25.2, lon: 55.27 },
  { id: "sin", place: "Singapore", lat: 1.35, lon: 103.82 },
  { id: "syd", place: "Sydney", lat: -33.87, lon: 151.21 },
  { id: "sao", place: "São Paulo", lat: -23.55, lon: -46.63 },
  { id: "cai", place: "Cairo", lat: 30.04, lon: 31.24 },
];
