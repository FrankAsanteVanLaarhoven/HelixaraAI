"use client";

import { useEffect } from "react";

/**
 * Apply saved theme without React <script> tags (blocked/warned in React 19).
 * Loads public/theme-boot.js as a classic script via DOM API (executes normally).
 */
export function ThemeBoot() {
  useEffect(() => {
    // Apply immediately from localStorage (same logic as theme-boot.js)
    try {
      const p = localStorage.getItem("helixara.theme") || "system";
      const r =
        p === "system"
          ? window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark"
          : p;
      document.documentElement.dataset.theme = r;
      document.documentElement.dataset.themePref = p;
      document.documentElement.style.colorScheme = r;
    } catch {
      /* ignore */
    }

    // Optional: ensure file is warm-cached for offline PWA shell
    const existing = document.querySelector(
      'script[data-helixara-theme-boot="1"]'
    );
    if (existing) return;

    const s = document.createElement("script");
    s.src = "/theme-boot.js";
    s.async = false;
    s.dataset.helixaraThemeBoot = "1";
    document.documentElement.appendChild(s);
  }, []);

  return null;
}
