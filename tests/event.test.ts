import { describe, it, expect } from "vitest";
import { eventDateKey, fmtTime } from "../lib/event";

// The agenda groups sessions by their date *in the event timezone* (Europe/
// Berlin), not the viewer's local date. These guard that TZ correctness.
describe("eventDateKey", () => {
  it("returns the Berlin-local date, not UTC", () => {
    // 2026-05-30T23:30:00Z is 2026-05-31 01:30 in Berlin (CEST, +02:00)
    expect(eventDateKey(new Date("2026-05-30T23:30:00Z"))).toBe("2026-05-31");
  });

  it("matches the seed sessions' local day", () => {
    expect(eventDateKey(new Date("2026-05-31T10:00:00+02:00"))).toBe("2026-05-31");
    expect(eventDateKey(new Date("2026-06-02T22:00:00+02:00"))).toBe("2026-06-02");
  });
});

describe("fmtTime", () => {
  it("formats in 24h Berlin time", () => {
    expect(fmtTime(new Date("2026-05-31T10:00:00+02:00"))).toBe("10:00");
    // 08:00 UTC == 10:00 Berlin
    expect(fmtTime(new Date("2026-05-31T08:00:00Z"))).toBe("10:00");
  });
});
