"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Registers the service worker and surfaces a non-intrusive "update ready"
 * prompt. The new worker waits (sw.js no longer auto-skipWaiting); tapping
 * Reload tells it to take over, then reloads once it controls the page.
 *
 * We intentionally do NOT reload on every controllerchange — that fires on the
 * first install's clients.claim() and would bounce every first visit. We only
 * reload after the user accepts an update.
 */
export function PWA() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const updating = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener("statechange", () => {
              // "installed" + an existing controller => an update is waiting.
              if (sw.state === "installed" && navigator.serviceWorker.controller) {
                setWaiting(sw);
              }
            });
          });
        })
        .catch(() => {
          /* offline support is best-effort */
        });
    };
    // Hydration usually runs after the window 'load' event has already fired,
    // so a plain addEventListener('load') would never run. Register now if the
    // document is already loaded; otherwise wait for load.
    if (document.readyState === "complete") {
      onLoad();
      return;
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  function applyUpdate() {
    if (!waiting || updating.current) return;
    updating.current = true;
    // Reload once the updated worker takes control.
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true }
    );
    waiting.postMessage("SKIP_WAITING");
  }

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-edge bg-panel px-4 py-3 shadow-lg">
      <p className="text-sm text-body">A new version is available.</p>
      <button className="btn btn-brand shrink-0" onClick={applyUpdate}>
        Reload
      </button>
    </div>
  );
}
