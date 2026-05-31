"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "./Icons";

type Theme = "light" | "dark";
const KEY = "te.theme";

/**
 * Floating light/dark switch. The no-flash script in layout.tsx has already
 * put `.light`/`.dark` on <html> (from saved choice or system preference)
 * before paint; here we just read that, flip it on tap, and persist.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-ink/80 text-fg shadow-sm backdrop-blur transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-page"
    >
      {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}
