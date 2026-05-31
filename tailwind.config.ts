import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Neutral + accent colours resolve through CSS variables (defined in
      // globals.css) so the whole palette flips between dark and light themes.
      // Variables hold "R G B" triplets so Tailwind's /alpha modifiers work.
      colors: {
        page: "rgb(var(--page) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        edge: "rgb(var(--edge) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        body: "rgb(var(--body) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        brand: {
          // Brand blue is a theme variable so links/accents clear WCAG AA on
          // both backgrounds (lighter on dark, darker on light). Filled buttons
          // use the fixed -strong so white text always clears AA (≥4.5:1).
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          strong: "#2563eb",
        },
        live: "rgb(var(--live) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        star: "rgb(var(--star) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
