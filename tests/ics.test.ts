import { describe, it, expect } from "vitest";
import { sessionsToIcs } from "../lib/ics";
import type { Session } from "../lib/types";

const ses: Session = {
  id: "ses-d1-opening",
  title: "Opening Keynote: Europe's Tech Moment",
  description: "Setting the stage; sovereignty, competitiveness.",
  start: "2026-05-31T10:00:00+02:00",
  end: "2026-05-31T10:45:00+02:00",
  stage: "Main Stage",
  track: "Keynote",
};

describe("sessionsToIcs", () => {
  const ics = sessionsToIcs([ses], 10);

  it("wraps events in a VCALENDAR", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
  });

  it("emits start/end as UTC stamps (Berlin +02:00 -> 08:00Z)", () => {
    expect(ics).toContain("DTSTART:20260531T080000Z");
    expect(ics).toContain("DTEND:20260531T084500Z");
  });

  it("carries summary, location and a stable UID", () => {
    expect(ics).toContain("SUMMARY:Opening Keynote: Europe's Tech Moment");
    expect(ics).toContain("LOCATION:Main Stage");
    expect(ics).toContain("UID:ses-d1-opening@lanyard");
  });

  it("adds a VALARM at the requested lead time", () => {
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT10M");
  });

  it("escapes commas and semicolons in text fields", () => {
    expect(ics).toContain("stage\\;");
    expect(ics).toContain("sovereignty\\,");
  });

  it("uses CRLF line endings and folds long lines", () => {
    expect(ics).toContain("\r\n");
    // folded continuation lines start with a single space
    expect(ics).toMatch(/\r\n /);
  });
});
