import { describe, it, expect } from "vitest";
import { parseBadge, parseBadgeText, linkedinSearchUrl } from "../lib/linkedin";

describe("parseBadge (QR / payload)", () => {
  it("parses a vCard with all fields", () => {
    const p = parseBadge(
      "BEGIN:VCARD\nVERSION:3.0\nFN:Aidan Gomez\nORG:Cohere;AI\nTITLE:Co-founder & CEO\nEMAIL:aidan@cohere.com\nEND:VCARD"
    );
    expect(p.name).toBe("Aidan Gomez");
    expect(p.company).toBe("Cohere"); // ORG splits on ";"
    expect(p.role).toBe("Co-founder & CEO");
    expect(p.email).toBe("aidan@cohere.com");
  });

  it("handles CRLF line endings and typed EMAIL params", () => {
    const p = parseBadge(
      "BEGIN:VCARD\r\nFN:Tim Höttges\r\nORG:Deutsche Telekom\r\nEMAIL;TYPE=WORK:tim@telekom.de\r\nEND:VCARD"
    );
    expect(p.name).toBe("Tim Höttges");
    expect(p.company).toBe("Deutsche Telekom");
    expect(p.email).toBe("tim@telekom.de");
  });

  it("extracts a LinkedIn URL embedded in any payload", () => {
    const p = parseBadge("Jane Doe https://www.linkedin.com/in/janedoe please connect");
    expect(p.linkedin).toBe("https://www.linkedin.com/in/janedoe");
  });

  it("parses generic key:value badge text", () => {
    const p = parseBadge("Name: Liisa-Ly Pakosta\nCompany = Government of Estonia\nRole: Minister");
    expect(p.name).toBe("Liisa-Ly Pakosta");
    expect(p.company).toBe("Government of Estonia");
    expect(p.role).toBe("Minister");
  });

  it("falls back to treating a short plain string as a name", () => {
    const p = parseBadge("Sarah Connor");
    expect(p.name).toBe("Sarah Connor");
  });

  it("does NOT treat a bare URL or a long blob as a name", () => {
    expect(parseBadge("https://example.com/attendee/12345").name).toBeUndefined();
    expect(parseBadge("x".repeat(120)).name).toBeUndefined();
  });

  it("always preserves the raw payload", () => {
    expect(parseBadge("  hi  ").raw).toBe("hi");
  });
});

describe("parseBadgeText (OCR heuristics)", () => {
  it("picks the capitalised name line and the org-keyword company", () => {
    const g = parseBadgeText("Maria Schmidt\nVP Engineering\nSiemens AG\nHall A");
    expect(g.name).toBe("Maria Schmidt");
    expect(g.company).toBe("Siemens AG"); // ORG_HINT matches "AG"
    expect(g.role).toMatch(/VP/i);
  });

  it("does not misread a 'Co-founder' role line as the company", () => {
    const g = parseBadgeText("Aidan Gomez\nCo-founder & CEO\nCohere");
    expect(g.name).toBe("Aidan Gomez");
    expect(g.role).toMatch(/Co-founder/i);
    expect(g.company).toBe("Cohere");
  });

  it("finds a keyword-less company that follows a role line", () => {
    // Name -> Role -> Company, company has no org keyword (Deutsche Telekom)
    const g = parseBadgeText("Tim Hottges\nCEO\nDeutsche Telekom");
    expect(g.role).toBe("CEO");
    expect(g.company).toBe("Deutsche Telekom");
  });

  it("recognises a government title as the role, not the company", () => {
    const g = parseBadgeText("Liisa-Ly Pakosta\nMinister of Justice\nGovernment of Estonia");
    expect(g.name).toBe("Liisa-Ly Pakosta");
    expect(g.role).toMatch(/Minister/i);
    expect(g.company).toBe("Government of Estonia");
  });

  it("handles German names with umlauts and hyphens", () => {
    const g = parseBadgeText("Tim Höttges\nCEO\nDeutsche Telekom AG");
    expect(g.name).toBe("Tim Höttges");
    expect(g.company).toBe("Deutsche Telekom AG");
    expect(g.role).toBe("CEO");
  });

  it("uses the line after the name as company when no org keyword exists", () => {
    const g = parseBadgeText("Sarah Connor\nSkynet\nResistance Leader");
    expect(g.name).toBe("Sarah Connor");
    expect(g.company).toBe("Skynet");
  });

  it("drops badge noise lines (attendee, booth, event name, urls)", () => {
    const g = parseBadgeText("ATTENDEE\nAcme Summit 2026\nMaria Schmidt\nBooth 14\nwww.acme.io");
    expect(g.name).toBe("Maria Schmidt");
  });

  it("returns undefined name when nothing looks like a person", () => {
    const g = parseBadgeText("ATTENDEE\nBADGE #4471\nHALL B");
    expect(g.name).toBeUndefined();
  });
});

describe("linkedinSearchUrl", () => {
  it("builds an encoded people-search deep link from name + company", () => {
    const url = linkedinSearchUrl("Tim Höttges", "Deutsche Telekom");
    expect(url).toContain("/search/results/people/");
    expect(url).toContain(encodeURIComponent("Tim Höttges Deutsche Telekom"));
  });

  it("tolerates a missing company", () => {
    expect(linkedinSearchUrl("Jane Doe")).toContain("keywords=Jane%20Doe");
  });
});
