"use client";

import { useEffect, useState } from "react";
import { IconDownload, IconX } from "./Icons";

const DISMISS_KEY = "te.install.dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Custom "Add to Home Screen" nudge. Installing the PWA is what makes offline
 * access and (where supported) background reminders actually work at the event.
 * Chromium fires `beforeinstallprompt`; iOS Safari doesn't, so we show a short
 * manual hint there instead. Dismissible and remembered.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // assume hidden until mounted

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    setDismissed(false);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = navigator.userAgent;
    const isIosSafari =
      /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIosSafari) setIosHint(true);

    const onInstalled = () => close();
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function close() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    close();
  }

  if (dismissed || (!deferred && !iosHint)) return null;

  return (
    <div className="card flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium text-fg"><IconDownload size={17} /> Install this app</p>
        <p className="muted">
          {deferred
            ? "Add it to your home screen for offline access and reliable reminders."
            : "In Safari, tap Share, then “Add to Home Screen” for offline use and reminders."}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {deferred && (
          <button className="btn btn-brand" onClick={install}>
            Install
          </button>
        )}
        <button className="btn !px-3" onClick={close} aria-label="Dismiss">
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}
