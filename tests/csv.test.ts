import { describe, it, expect } from "vitest";
import { contactsToCsv } from "../lib/csv";
import type { Contact } from "../lib/types";

const base: Contact = {
  id: "1",
  name: "Jane Doe",
  company: "Acme",
  role: "CTO",
  linkedin: "",
  email: "jane@acme.io",
  notes: "",
  tags: ["Hot lead", "Investor"],
  metAt: "2026-05-31T10:00:00.000Z",
  source: "manual",
};

describe("contactsToCsv", () => {
  it("emits a header row and joins tags with ;", () => {
    const csv = contactsToCsv([base]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("Name,Company,Role,LinkedIn,Email,Tags,Met At,Source,Notes");
    expect(row).toContain("Hot lead; Investor");
  });

  it("quotes and escapes values containing commas, quotes or newlines", () => {
    const csv = contactsToCsv([
      { ...base, notes: 'Said "hi", then left\nfollow up' },
    ]);
    // internal quotes doubled, whole field wrapped in quotes
    expect(csv).toContain('"Said ""hi"", then left\nfollow up"');
  });

  it("handles unicode (umlauts) without mangling", () => {
    const csv = contactsToCsv([{ ...base, name: "Tim Höttges" }]);
    expect(csv).toContain("Tim Höttges");
  });

  // CSV injection (CWE-1236): a cell beginning with = + - or @ must not import
  // as a live formula in Excel / Google Sheets.
  it("neutralises spreadsheet formula injection", () => {
    const csv = contactsToCsv([
      { ...base, notes: '=HYPERLINK("http://evil.test","click")' },
    ]);
    expect(csv).toContain("'=HYPERLINK"); // prefixed with a quote -> text
    expect(csv).not.toMatch(/,=HYPERLINK/); // never starts a cell with bare =
  });

  it("prefixes other formula leads (+, -, @) too", () => {
    const csv = contactsToCsv([{ ...base, company: "@SUM(A1:A9)" }]);
    expect(csv).toContain("'@SUM");
  });
});
