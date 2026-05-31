import { describe, it, expect } from "vitest";
import { classify, stateFor, overlaps, starredConflicts } from "../lib/agenda";
import type { Session } from "../lib/types";

const S = (id: string, start: string, end: string): Session => ({
  id,
  title: id,
  start,
  end,
});

// All event sessions share the +02:00 (CEST) offset, matching the seed data.
const a = S("a", "2026-05-31T10:00:00+02:00", "2026-05-31T11:00:00+02:00");
const b = S("b", "2026-05-31T11:00:00+02:00", "2026-05-31T12:00:00+02:00");
const c = S("c", "2026-05-31T11:00:00+02:00", "2026-05-31T11:30:00+02:00"); // same start as b
const at = (iso: string) => new Date(iso);

describe("classify", () => {
  it("marks a session live at its exact start and not at its exact end", () => {
    expect(classify([a], at("2026-05-31T10:00:00+02:00")).live).toEqual([a]);
    // at end: no longer live -> past
    const end = classify([a], at("2026-05-31T11:00:00+02:00"));
    expect(end.live).toEqual([]);
    expect(end.past).toEqual([a]);
  });

  it("groups all sessions sharing the earliest upcoming start into 'next'", () => {
    const r = classify([a, b, c], at("2026-05-31T09:00:00+02:00"));
    // earliest start is 'a' at 10:00 -> next; b & c (11:00) -> upcoming
    expect(r.next.map((s) => s.id)).toEqual(["a"]);
    expect(r.upcoming.map((s) => s.id).sort()).toEqual(["b", "c"]);
  });

  it("groups simultaneous starts together in 'next'", () => {
    const r = classify([b, c], at("2026-05-31T10:30:00+02:00"));
    expect(r.next.map((s) => s.id).sort()).toEqual(["b", "c"]);
    expect(r.upcoming).toEqual([]);
  });

  it("separates live, next and past simultaneously", () => {
    // 11:15 -> b live (11:00-12:00), a past, nothing upcoming
    const r = classify([a, b], at("2026-05-31T11:15:00+02:00"));
    expect(r.live.map((s) => s.id)).toEqual(["b"]);
    expect(r.past.map((s) => s.id)).toEqual(["a"]);
    expect(r.next).toEqual([]);
  });

  it("returns empty buckets for no sessions", () => {
    const r = classify([], at("2026-05-31T10:00:00+02:00"));
    expect(r).toEqual({ live: [], next: [], upcoming: [], past: [] });
  });
});

describe("stateFor", () => {
  it("returns live/upcoming/past around the window", () => {
    expect(stateFor(a, at("2026-05-31T09:59:00+02:00"))).toBe("upcoming");
    expect(stateFor(a, at("2026-05-31T10:30:00+02:00"))).toBe("live");
    expect(stateFor(a, at("2026-05-31T11:00:00+02:00"))).toBe("past");
  });
});

describe("overlaps / starredConflicts", () => {
  it("detects overlap but treats touching edges as no clash", () => {
    expect(overlaps(b, c)).toBe(true); // 11:00-12:00 vs 11:00-11:30
    expect(overlaps(a, b)).toBe(false); // 10:00-11:00 vs 11:00-12:00 (touch)
  });

  it("only reports conflicts among starred sessions, excluding itself", () => {
    const stars = new Set(["b", "c"]);
    expect(starredConflicts(b, stars, [a, b, c]).map((s) => s.id)).toEqual(["c"]);
    // 'a' isn't starred -> no conflicts reported for it
    expect(starredConflicts(a, stars, [a, b, c])).toEqual([]);
  });
});
