// ┌─────────────────────────────────────────────────────────────────────────┐
// │  EDIT THIS FILE to make the companion your own.                           │
// │  Everything event-specific (name, dates, branding) lives here.            │
// │  Your program/speaker/company data goes in data/*.json (see README).      │
// └─────────────────────────────────────────────────────────────────────────┘

export const event = {
  /** Full event name — shown in headers, the PWA name, and the install title. */
  name: "TECH 2026",
  /** Short name for the home-screen icon / PWA short_name (keep it brief). */
  shortName: "TECH",
  /** One-line subtitle shown under the title in a few places. */
  tagline: "Europe's leading platform for tech, innovation, and future business models.",
  /** Where the event is held (free text). */
  city: "Heilbronn, Germany",
  /**
   * IANA timezone of the venue. MUST match the UTC offsets in
   * data/sessions.json (e.g. "Europe/Berlin" → +01:00/+02:00).
   */
  timezone: "Europe/Berlin",
  /** Local dates (YYYY-MM-DD) the agenda's day picker offers, in order. */
  days: ["2026-05-31", "2026-06-01", "2026-06-02"],
  /** The event's public website (used for the "Website" links). */
  website: "https://www.tech-europe.org",
} as const;

export type EventConfig = typeof event;
