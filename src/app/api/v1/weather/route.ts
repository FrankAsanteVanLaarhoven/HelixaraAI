import { NextRequest, NextResponse } from "next/server";
import {
  WEATHER_CITIES,
  getSevenDayForecast,
} from "@/modules/weather/forecast";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const cityId = sp.get("city");
    const city = WEATHER_CITIES.find((c) => c.id === cityId) || WEATHER_CITIES[0];
    const lat = Number(sp.get("lat") || city.lat);
    const lon = Number(sp.get("lon") || city.lon);
    const place = sp.get("place") || city.place;
    const forecast = await getSevenDayForecast(lat, lon, place);
    return NextResponse.json({ forecast, cities: WEATHER_CITIES });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "weather failed" },
      { status: 502 }
    );
  }
}
