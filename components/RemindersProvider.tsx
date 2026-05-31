"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useStars } from "./StarsProvider";
import { getSession } from "@/lib/data";
import { safeSetItem } from "@/lib/storage";
import { fmtTime } from "@/lib/event";
import {
  DEFAULT_LEAD,
  REMINDER_ENABLED_KEY,
  REMINDER_LEAD_KEY,
  notificationsSupported,
  notify,
  scheduleBackgroundReminders,
  clearBackgroundReminders,
  triggersSupported,
  type ReminderItem,
} from "@/lib/reminders";

interface RemindersCtx {
  supported: boolean;
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  leadMinutes: number;
  scheduledCount: number;
  /** True when reminders also fire with the app closed (Notification Triggers). */
  backgroundCapable: boolean;
  enable: () => Promise<void>;
  disable: () => void;
  setLeadMinutes: (m: number) => void;
  sendTest: () => void;
}

const Ctx = createContext<RemindersCtx | null>(null);

// setTimeout overflows past ~24.8 days; clamp well under that.
const MAX_DELAY = 2_000_000_000;

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const { stars } = useStars();
  const supported = notificationsSupported();

  const [enabled, setEnabled] = useState(false);
  const [leadMinutes, setLead] = useState(DEFAULT_LEAD);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [scheduledCount, setScheduledCount] = useState(0);

  const timers = useRef<number[]>([]);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!supported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    setEnabled(
      localStorage.getItem(REMINDER_ENABLED_KEY) === "1" && Notification.permission === "granted"
    );
    const saved = Number(localStorage.getItem(REMINDER_LEAD_KEY));
    if (saved > 0) setLead(saved);
  }, [supported]);

  const reschedule = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    if (!enabled) {
      setScheduledCount(0);
      return;
    }
    // Reminders track real wall-clock time, independent of the demo time
    // override used for previewing the agenda UI.
    const now = Date.now();
    let count = 0;
    const upcoming: ReminderItem[] = [];

    stars.forEach((id) => {
      const s = getSession(id);
      if (!s) return;
      const start = new Date(s.start).getTime();
      if (start <= now) return; // already started
      upcoming.push({ id: s.id, title: s.title, stage: s.stage, start: s.start });

      const fire = () => {
        if (fired.current.has(id)) return;
        fired.current.add(id);
        void notify(
          `Starting soon · ${fmtTime(new Date(s.start))}`,
          `${s.title}${s.stage ? ` — ${s.stage}` : ""}`,
          id
        );
      };

      const delay = start - leadMinutes * 60_000 - now;
      if (delay <= 0) {
        fire(); // within the lead window already
        return;
      }
      count++;
      timers.current.push(window.setTimeout(fire, Math.min(delay, MAX_DELAY)));
    });

    setScheduledCount(count);
    // Additionally arm OS-level triggers so nudges fire with the app closed
    // (Chromium only). Same tags as the foreground path, so at most one shows.
    void scheduleBackgroundReminders(upcoming, leadMinutes, fmtTime);
  }, [enabled, leadMinutes, stars]);

  useEffect(() => {
    reschedule();
    const onWake = () => reschedule();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [reschedule]);

  const enable = async () => {
    if (!supported) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      setEnabled(true);
      safeSetItem(REMINDER_ENABLED_KEY, "1");
    }
  };

  const disable = () => {
    setEnabled(false);
    safeSetItem(REMINDER_ENABLED_KEY, "0");
    void clearBackgroundReminders();
  };

  const setLeadMinutes = (m: number) => {
    setLead(m);
    safeSetItem(REMINDER_LEAD_KEY, String(m));
    fired.current.clear(); // allow re-firing under the new lead time
  };

  const sendTest = () =>
    void notify("Reminders are on ✓", "You'll get a nudge before your starred sessions.", "test");

  return (
    <Ctx.Provider
      value={{ supported, enabled, permission, leadMinutes, scheduledCount, backgroundCapable: triggersSupported(), enable, disable, setLeadMinutes, sendTest }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useReminders(): RemindersCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReminders must be used within RemindersProvider");
  return ctx;
}
