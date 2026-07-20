"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((r) => {
        reg = r;
        setReady(true);
        // Prefer new SW when available
        r.addEventListener("updatefound", () => {
          const nw = r.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => setReady(false));

    return () => {
      void reg;
    };
  }, []);

  // Silent registration — optional status for dev
  useEffect(() => {
    if (ready && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.info("[HelixaraAI] PWA service worker registered");
    }
  }, [ready]);

  return null;
}
