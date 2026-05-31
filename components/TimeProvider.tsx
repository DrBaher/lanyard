"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTimeOverride, setTimeOverride } from "@/lib/storage";

interface TimeCtx {
  now: Date;
  override: Date | null;
  setOverride: (iso: string | null) => void;
}

const Ctx = createContext<TimeCtx | null>(null);

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);
  const [override, setOv] = useState<Date | null>(null);

  // Load any saved demo override once on mount.
  useEffect(() => {
    const saved = getTimeOverride();
    if (saved) setOv(new Date(saved));
  }, []);

  // Advance the clock every 30s so "happening now" stays fresh.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const now = useMemo(() => override ?? new Date(), [override, tick]);

  const setOverride = (iso: string | null) => {
    setTimeOverride(iso);
    setOv(iso ? new Date(iso) : null);
  };

  return <Ctx.Provider value={{ now, override, setOverride }}>{children}</Ctx.Provider>;
}

export function useNow(): TimeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNow must be used within TimeProvider");
  return ctx;
}
