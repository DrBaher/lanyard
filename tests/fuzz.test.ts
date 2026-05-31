import { describe, it, expect } from "vitest";
import { parseBadge, parseBadgeText } from "../lib/linkedin";
import { contactsToCsv } from "../lib/csv";
import { sessionsToIcs } from "../lib/ics";
import type { Contact, Session } from "../lib/types";

// Deterministic PRNG so any failure reproduces. Mulberry32.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABETS = [
  "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "0123456789 .,;:-_/\\\"'`",
  "ÀÁÂÃÄÅàáâãäåöüßÖÜçñ€£",
  "=+-@\t\r\n", // formula-injection + control chars
  "👋🏽🎟️🧠—…«»🇩🇪",
  "BEGIN:VCARD\nEND:VCARD FN: ORG: TITLE: EMAIL: name= company= role= https://linkedin.com/in/x",
];

function randString(r: () => number, maxLen: number): string {
  const len = Math.floor(r() * maxLen);
  const alpha = ALPHABETS[Math.floor(r() * ALPHABETS.length)];
  let s = "";
  for (let i = 0; i < len; i++) {
    // occasionally mix alphabets within one string
    const a = r() < 0.15 ? ALPHABETS[Math.floor(r() * ALPHABETS.length)] : alpha;
    s += a[Math.floor(r() * a.length)];
  }
  return s;
}

const r = rng(0xC0FFEE);
const N = 3000;

describe("fuzz: badge parsers never throw and keep invariants", () => {
  it(`survives ${N} random payloads`, () => {
    for (let i = 0; i < N; i++) {
      const input = randString(r, 200);
      const a = parseBadge(input);
      expect(typeof a.raw).toBe("string");
      expect(a.raw).toBe(input.trim());
      for (const k of ["name", "company", "role", "email", "linkedin"] as const) {
        if (a[k] !== undefined) expect(typeof a[k]).toBe("string");
      }
      const b = parseBadgeText(input);
      expect(b.raw).toBe(input);
      for (const k of ["name", "company", "role"] as const) {
        if (b[k] !== undefined) expect(typeof b[k]).toBe("string");
      }
    }
  });
});

describe("fuzz: CSV export is crash-free and injection-safe", () => {
  it(`survives ${N} random contacts`, () => {
    for (let i = 0; i < N; i++) {
      const c: Contact = {
        id: String(i),
        name: randString(r, 60),
        company: randString(r, 40),
        role: randString(r, 30),
        linkedin: randString(r, 30),
        email: randString(r, 30),
        notes: randString(r, 120),
        tags: [randString(r, 12), randString(r, 12)],
        metAt: "2026-05-31T10:00:00.000Z",
        source: "manual",
      };
      const csv = contactsToCsv([c]);
      expect(csv.startsWith("Name,Company,Role")).toBe(true);
      // No data cell may begin with a raw formula char once CSV quoting is removed.
      for (const cell of csv.split("\n").slice(1).join("\n").split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
        const unquoted = cell.startsWith('"') ? cell.slice(1) : cell;
        expect(/^[=+\-@\t\r]/.test(unquoted)).toBe(false);
      }
    }
  });
});

describe("fuzz: ICS export stays well-formed", () => {
  it(`survives ${N} random sessions`, () => {
    for (let i = 0; i < N; i++) {
      const s: Session = {
        id: randString(r, 20) || "id",
        title: randString(r, 80),
        description: randString(r, 150),
        start: "2026-05-31T10:00:00+02:00",
        end: "2026-05-31T11:00:00+02:00",
        stage: randString(r, 25),
        track: randString(r, 20),
      };
      const ics = sessionsToIcs([s], 10);
      expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
      expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
      expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(1);
      expect((ics.match(/END:VEVENT/g) || []).length).toBe(1);
      // every physical line stays within the folded 75-octet target (+CRLF slack)
      for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});
