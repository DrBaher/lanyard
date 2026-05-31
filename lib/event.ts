// Timezone-aware date helpers. The editable event details live in the
// top-level `event.config.ts`, re-exported here as EVENT. The configured
// timezone must match the UTC offsets used in data/sessions.json.

import { event } from "@/event.config";

export const EVENT = event;

/** Format a Date in the event's timezone. */
export function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: EVENT.timezone,
  }).format(d);
}

export function fmtDay(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: EVENT.timezone,
  }).format(d);
}

/** YYYY-MM-DD for a Date as seen in the event timezone. */
export function eventDateKey(d: Date): string {
  // en-CA yields ISO-like YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: EVENT.timezone,
  }).format(d);
}
