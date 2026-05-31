import type { Contact } from "./types";

// Escape per RFC 6350 §3.4: backslash, comma, semicolon and newlines.
const esc = (v: string) =>
  v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

/** Build a multi-card vCard (.vcf) so contacts import straight into a phone. */
export function contactsToVcf(contacts: Contact[]): string {
  return contacts
    .map((c) =>
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${esc(c.name)}`,
        c.company && `ORG:${esc(c.company)}`,
        c.role && `TITLE:${esc(c.role)}`,
        c.email && `EMAIL:${esc(c.email)}`,
        c.linkedin && `URL:${esc(c.linkedin)}`,
        // CATEGORIES is comma-separated, so escape each tag but join with commas.
        c.tags.length && `CATEGORIES:${c.tags.map(esc).join(",")}`,
        c.notes && `NOTE:${esc(c.notes)}`,
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\r\n")
    )
    .join("\r\n");
}

export function downloadVcf(filename: string, vcf: string) {
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
