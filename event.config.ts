// ┌─────────────────────────────────────────────────────────────────────────┐
// │  EDIT THIS FILE to make the companion your own.                           │
// │  Everything event-specific (name, dates, branding) lives here.            │
// │  Your program/speaker/company data goes in data/*.json (see README).      │
// └─────────────────────────────────────────────────────────────────────────┘

export const event = {
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
} as const;

export type EventConfig = typeof event;
