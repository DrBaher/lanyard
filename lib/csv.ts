import type { Contact } from "./types";

// A leading =, +, -, @ (or tab/CR) makes Excel/Sheets treat the cell as a
// formula — CSV injection (CWE-1236). Prefix such values with a single quote
// so they import as plain text.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function escape(value: string): string {
  let v = FORMULA_LEAD.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Build a CRM-friendly CSV from the locally stored contacts. */
export function contactsToCsv(contacts: Contact[]): string {
  const headers = [
    "Name",
    "Company",
    "Role",
    "LinkedIn",
    "Email",
    "Tags",
    "Met At",
    "Source",
    "Notes",
  ];
  const rows = contacts.map((c) =>
    [
      c.name,
      c.company ?? "",
      c.role ?? "",
      c.linkedin ?? "",
      c.email ?? "",
      c.tags.join("; "),
      c.metAt,
      c.source,
      c.notes,
    ]
      .map((v) => escape(String(v)))
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
