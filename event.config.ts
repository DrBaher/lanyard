// ┌─────────────────────────────────────────────────────────────────────────┐
// │  EDIT THIS FILE to make the companion your own — or, to keep the public   │
// │  repo a neutral template, leave these defaults and override per-event in  │
// │  data/event.json (the build overlays it from your data repo; see          │
// │  scripts/fetch-data.mjs). Your program data goes in data/*.json.          │
// └─────────────────────────────────────────────────────────────────────────┘

import overrides from "@/data/event.json";

// Generic template defaults. Any key set in data/event.json wins over these, so
// event-specific branding can live with your (optionally private) data instead
// of in the public code.
const defaults = {
  /** Full event name — shown in headers, the PWA name, and the install title. */
  name: "Sample Summit 2026",
  /** Short name for the home-screen icon / PWA short_name (keep it brief). */
  shortName: "Summit",
  /** One-line subtitle shown under the title in a few places. */
  tagline: "A demo event companion — replace with your event.",
  /** Where the event is held (free text). */
  city: "Demo City",
  /**
   * IANA timezone of the venue. MUST match the UTC offsets in
   * data/sessions.json (e.g. "Europe/Berlin" → +01:00/+02:00).
   */
  timezone: "Europe/Berlin",
  /** Local dates (YYYY-MM-DD) the agenda's day picker offers, in order. */
  days: ["2026-06-01", "2026-06-02"],
  /** The event's public website (used for the "Website" links). */
  website: "https://example.com",
};

export const event = { ...defaults, ...(overrides as Partial<typeof defaults>) };

export type EventConfig = typeof event;
