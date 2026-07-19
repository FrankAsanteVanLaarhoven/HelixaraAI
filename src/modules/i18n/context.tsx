"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LOCALES,
  LocaleCode,
  MessageKey,
  getCatalog,
  isRtl,
  t as translate,
} from "@/modules/i18n/locales";

type I18nCtx = {
  locale: LocaleCode;
  currency: string;
  setLocale: (c: LocaleCode) => void;
  setCurrency: (c: string) => void;
  t: (key: MessageKey) => string;
  catalog: ReturnType<typeof getCatalog>;
  locales: typeof LOCALES;
  dir: "ltr" | "rtl";
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("en");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    try {
      const l = localStorage.getItem("helixara.locale") as LocaleCode | null;
      const c = localStorage.getItem("helixara.currency");
      if (l && LOCALES.some((x) => x.code === l)) setLocaleState(l);
      if (c) setCurrency(c);
    } catch {
      /* ssr */
    }
  }, []);

  const setLocale = useCallback((c: LocaleCode) => {
    setLocaleState(c);
    try {
      localStorage.setItem("helixara.locale", c);
      const meta = LOCALES.find((x) => x.code === c);
      if (meta) {
        setCurrency(meta.currency);
        localStorage.setItem("helixara.currency", meta.currency);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      currency,
      setLocale,
      setCurrency: (c: string) => {
        setCurrency(c);
        try {
          localStorage.setItem("helixara.currency", c);
        } catch {
          /* ignore */
        }
      },
      t: (key) => translate(locale, key),
      catalog: getCatalog(locale),
      locales: LOCALES,
      dir: isRtl(locale) ? "rtl" : "ltr",
    }),
    [locale, currency, setLocale]
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = value.dir;
    }
  }, [locale, value.dir]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n requires I18nProvider");
  return ctx;
}
