// iCalendar (.ics) export. Lets attendees drop a session — or their whole
// starred schedule — into the phone's native calendar, which gives a reliable
// OS-level alarm even when this app is closed (a robust complement to the
// in-app, foreground-only reminders).

import type { Session } from "./types";
import { DEFAULT_LEAD } from "./reminders";
import { EVENT } from "./event";

/** Date -> iCal UTC stamp, e.g. 20260531T080000Z */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape per RFC 5545 (backslash, comma, semicolon, newline). */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines to 75 octets as RFC 5545 recommends (continuation = CRLF + space). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

function vevent(s: Session, alarmMinutes: number): string[] {
  const topics = s.tags?.length ? s.tags.join(", ") : s.track;
  const desc = [topics ? `Topics: ${topics}` : "", s.description ?? ""]
    .filter(Boolean)
    .join("\n");
  const lines = [
    "BEGIN:VEVENT",
    `UID:${s.id}@lanyard`,
    `DTSTAMP:${icsDate(new Date(s.start))}`,
    `DTSTART:${icsDate(new Date(s.start))}`,
    `DTEND:${icsDate(new Date(s.end))}`,
    `SUMMARY:${esc(s.title)}`,
  ];
  if (s.stage) lines.push(`LOCATION:${esc(s.stage)}`);
  if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
  if (alarmMinutes > 0) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:-PT${alarmMinutes}M`,
      `DESCRIPTION:${esc(s.title)} starts soon`,
      "END:VALARM"
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

export function sessionsToIcs(
  sessions: Session[],
  alarmMinutes: number = DEFAULT_LEAD
): string {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${EVENT.name} Companion//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...sessions.flatMap((s) => vevent(s, alarmMinutes)),
    "END:VCALENDAR",
  ];
  return body.map(fold).join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
