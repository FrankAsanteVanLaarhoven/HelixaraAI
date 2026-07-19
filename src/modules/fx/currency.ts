/**
 * FX rates via Frankfurter (ECB data) — free, no key.
 */

import { emitEvent } from "@/modules/events/bus";

export interface FxBundle {
  base: string;
  date: string;
  rates: Record<string, number>;
  fetchedAt: string;
  source: string;
}

const DEFAULT_SYMBOLS = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "INR",
  "AED",
  "SGD",
  "AUD",
  "CAD",
  "CHF",
  "BRL",
  "KRW",
  "MXN",
  "ZAR",
  "SEK",
  "NOK",
  "TRY",
  "PLN",
  "HKD",
];

export async function getFxRates(base = "USD"): Promise<FxBundle> {
  const symbols = DEFAULT_SYMBOLS.filter((s) => s !== base).join(",");
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${symbols}`,
    { signal: AbortSignal.timeout(10_000) }
  );
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  const data = (await res.json()) as {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  const bundle: FxBundle = {
    base: data.base,
    date: data.date,
    rates: data.rates,
    fetchedAt: new Date().toISOString(),
    source: "frankfurter/ECB",
  };

  emitEvent({
    type: "fx.updated",
    source: "frankfurter",
    severity: "info",
    title: `FX rates · base ${base}`,
    payload: { currencies: Object.keys(data.rates).length, date: data.date },
  });

  return bundle;
}

export function convert(amount: number, rate: number) {
  return Math.round(amount * rate * 100) / 100;
}

export const CURRENCY_META: Record<
  string,
  { symbol: string; name: string }
> = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  CHF: { symbol: "CHF", name: "Swiss Franc" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  KRW: { symbol: "₩", name: "South Korean Won" },
  MXN: { symbol: "MX$", name: "Mexican Peso" },
  ZAR: { symbol: "R", name: "South African Rand" },
  SEK: { symbol: "kr", name: "Swedish Krona" },
  NOK: { symbol: "kr", name: "Norwegian Krone" },
  TRY: { symbol: "₺", name: "Turkish Lira" },
  PLN: { symbol: "zł", name: "Polish Zloty" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
};
