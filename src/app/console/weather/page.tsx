"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/modules/i18n/context";

export default function WeatherPage() {
  const { t, currency } = useI18n();
  const [city, setCity] = useState("lon");
  const [data, setData] = useState<{
    forecast: {
      place: string;
      current?: { tempC: number; windKmh: number; summary: string };
      daily: {
        date: string;
        tMaxC: number;
        tMinC: number;
        precipitationMm: number;
        summary: string;
        windMaxKmh: number;
      }[];
      source: string;
    };
    cities: { id: string; place: string }[];
  } | null>(null);
  const [fx, setFx] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch(`/api/v1/weather?city=${city}`)
      .then((r) => r.json())
      .then(setData);
  }, [city]);

  useEffect(() => {
    fetch(`/api/v1/fx?base=USD`)
      .then((r) => r.json())
      .then((d) => setFx(d.rates || null));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
          Module · Weather & FX
        </div>
        <h1 className="text-2xl font-semibold">{t("weather.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lm-muted)]">
          {t("weather.desc")} · {t("common.currency")}: {currency}
          {fx?.[currency] != null ? ` · 1 USD = ${fx[currency]} ${currency}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(data?.cities || []).map((c) => (
          <button
            key={c.id}
            className={city === c.id ? "lm-btn" : "lm-btn opacity-60"}
            onClick={() => setCity(c.id)}
          >
            {c.place}
          </button>
        ))}
      </div>

      {data?.forecast ? (
        <>
          <div className="lm-panel rounded-lg p-4">
            <div className="text-lg text-cyan-200">{data.forecast.place}</div>
            {data.forecast.current ? (
              <div className="mt-1 text-sm text-[var(--lm-muted)]">
                Now: {data.forecast.current.tempC}°C · {data.forecast.current.summary} ·
                wind {data.forecast.current.windKmh} km/h
              </div>
            ) : null}
            <div className="mt-1 text-[10px] text-[var(--lm-muted)]">
              source {data.forecast.source}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {data.forecast.daily.map((d) => (
              <div key={d.date} className="lm-panel rounded-lg p-3 text-sm">
                <div className="text-[10px] uppercase text-[var(--lm-muted)]">
                  {d.date}
                </div>
                <div className="mt-1 text-cyan-200">{d.summary}</div>
                <div className="mt-1 tabular-nums">
                  {d.tMinC}° / {d.tMaxC}°C
                </div>
                <div className="text-[11px] text-[var(--lm-muted)]">
                  precip {d.precipitationMm} mm · wind {d.windMaxKmh}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-sm text-[var(--lm-muted)]">{t("common.loading")}</div>
      )}
    </div>
  );
}
