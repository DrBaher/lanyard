"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getStars, toggleStar as persistToggle } from "@/lib/storage";

interface StarsCtx {
  stars: Set<string>;
  toggle: (id: string) => void;
  isStarred: (id: string) => boolean;
}

const Ctx = createContext<StarsCtx | null>(null);

export function StarsProvider({ children }: { children: React.ReactNode }) {
  const [stars, setStars] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStars(new Set(getStars()));
  }, []);

  const toggle = (id: string) => setStars(new Set(persistToggle(id)));
  const isStarred = (id: string) => stars.has(id);

  return <Ctx.Provider value={{ stars, toggle, isStarred }}>{children}</Ctx.Provider>;
}

export function useStars(): StarsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStars must be used within StarsProvider");
  return ctx;
}
