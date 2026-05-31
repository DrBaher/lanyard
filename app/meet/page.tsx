"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Contact } from "@/lib/types";
import { getContacts, saveContact, deleteContact } from "@/lib/storage";
import { contactsToCsv, downloadCsv } from "@/lib/csv";
import { contactsToVcf, downloadVcf } from "@/lib/vcard";
import { parseBadge, linkedinSearchUrl, type OcrGuess } from "@/lib/linkedin";
import { QrScanner } from "@/components/QrScanner";
import { BadgeOcrScanner } from "@/components/BadgeOcrScanner";
import { ContactForm } from "@/components/ContactForm";
import { LinkedInIcon } from "@/components/LinkedInIcon";
import { IconCard, IconEdit, IconTrash, IconScan, IconPlus, IconDownload, IconType, IconStar } from "@/components/Icons";
import { Avatar } from "@/components/Avatar";
import { fmtDay, fmtTime } from "@/lib/event";
import { warmupOcr } from "@/lib/ocr";

type ScanMethod = "qr" | "ocr";
type Mode =
  | { kind: "list" }
  | { kind: "scan"; method: ScanMethod }
  | { kind: "edit"; contact: Partial<Contact> };

export default function MeetPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [sortName, setSortName] = useState(false);

  useEffect(() => setContacts(getContacts()), []);

  // Warm the OCR worker as soon as the scan screen opens (even on the QR tab),
  // so it's ready the instant the user switches to "Read text".
  useEffect(() => {
    if (mode.kind === "scan") void warmupOcr().catch(() => {});
  }, [mode.kind]);

  function handleQr(text: string) {
    const parsed = parseBadge(text);
    setMode({
      kind: "edit",
      contact: {
        name: parsed.name,
        company: parsed.company,
        role: parsed.role,
        email: parsed.email,
        linkedin: parsed.linkedin,
        raw: parsed.raw,
        source: "scan",
        notes: "",
        tags: [],
      },
    });
  }

  function handleOcr(guess: OcrGuess) {
    setMode({
      kind: "edit",
      contact: {
        name: guess.name,
        company: guess.company,
        role: guess.role,
        raw: guess.raw,
        source: "scan",
        notes: "",
        tags: [],
      },
    });
  }

  function handleSave(c: Contact) {
    setContacts(saveContact(c));
    setMode({ kind: "list" });
  }

  function handleDelete(id: string) {
    if (confirm("Delete this contact?")) setContacts(deleteContact(id));
  }

  // Exports follow the current view (search + tag filter), so you can export
  // just "Investors" or "Follow up" rather than the whole list.
  function exportCsv() {
    if (filtered.length === 0) return;
    downloadCsv("tech-2026-contacts.csv", contactsToCsv(filtered));
  }

  function exportVcf() {
    if (filtered.length === 0) return;
    downloadVcf("tech-2026-contacts.vcf", contactsToVcf(filtered));
  }

  function togglePin(c: Contact) {
    setContacts(saveContact({ ...c, pinned: !c.pinned }));
  }

  // Tags you've actually used, most-used first — drive the filter chips.
  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const c of contacts) for (const t of c.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = contacts.filter((c) => {
      if (tag && !c.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    // Default keeps storage order (most recently added first).
    const sorted = sortName ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
    // Pinned ("follow up") contacts float to the top, keeping each group's order.
    return [...sorted].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [contacts, query, tag, sortName]);

  if (mode.kind === "scan") {
    const method = mode.method;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-fg">Scan a badge</h1>

        <div className="flex gap-2">
          <button
            className={`btn flex-1 ${method === "qr" ? "btn-brand" : ""}`}
            onClick={() => setMode({ kind: "scan", method: "qr" })}
          >
            <IconCard size={17} /> QR code
          </button>
          <button
            className={`btn flex-1 ${method === "ocr" ? "btn-brand" : ""}`}
            onClick={() => setMode({ kind: "scan", method: "ocr" })}
          >
            <IconType size={17} /> Read text (OCR)
          </button>
        </div>

        {method === "qr" ? (
          <>
            <p className="muted">
              Point the camera at the QR code on someone&apos;s badge. If the
              badge has no QR, switch to “Read text”.
            </p>
            <QrScanner onResult={handleQr} onCancel={() => setMode({ kind: "list" })} />
          </>
        ) : (
          <>
            <p className="muted">
              On-device OCR reads the printed name &amp; company — nothing leaves
              your phone. You&apos;ll confirm the details before saving.
            </p>
            <BadgeOcrScanner onResult={handleOcr} onCancel={() => setMode({ kind: "list" })} />
          </>
        )}

        <button
          className="btn w-full"
          onClick={() => setMode({ kind: "edit", contact: { source: "manual", notes: "", tags: [] } })}
        >
          Or add manually
        </button>
      </div>
    );
  }

  if (mode.kind === "edit") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-fg">
          {mode.contact.id ? "Edit contact" : "New contact"}
        </h1>
        {mode.contact.source === "scan" && (
          <p className="chip">Scanned · review, fix any OCR slips &amp; add notes</p>
        )}
        <ContactForm
          initial={mode.contact}
          onSave={handleSave}
          onCancel={() => setMode({ kind: "list" })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pr-12">
        <div>
          <h1 className="text-2xl font-bold text-fg">Meet</h1>
          <p className="muted">
            {filtered.length === contacts.length
              ? `${contacts.length} contacts`
              : `${filtered.length} of ${contacts.length}`} · stored on this device
          </p>
        </div>
        <Link href="/me" className="btn shrink-0 whitespace-nowrap"><IconCard size={16} /> My card</Link>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-brand" onClick={() => setMode({ kind: "scan", method: "qr" })}>
          <IconScan size={18} /> Scan badge
        </button>
        <button className="btn" onClick={() => setMode({ kind: "edit", contact: { source: "manual", notes: "", tags: [] } })}>
          <IconPlus size={18} /> Add manually
        </button>
      </div>

      {contacts.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            className="input min-w-0"
            placeholder="Search contacts…"
            aria-label="Search contacts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn shrink-0 !px-3" onClick={exportCsv} aria-label="Export current view as CSV"><IconDownload size={17} /> CSV</button>
          <button className="btn shrink-0 !px-3" onClick={exportVcf} aria-label="Export current view as vCard">vCard</button>
        </div>
      )}

      {contacts.length > 1 && (
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
          <button
            onClick={() => setSortName((s) => !s)}
            className={`chip shrink-0 ${sortName ? "border-brand text-brand" : ""}`}
          >
            A–Z
          </button>
          {allTags.length > 0 && (
            <>
              <button
                onClick={() => setTag("")}
                className={`chip shrink-0 ${!tag ? "border-brand text-brand" : ""}`}
              >
                All
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={`chip shrink-0 ${tag === t ? "border-brand text-brand" : ""}`}
                >
                  {t}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {contacts.length === 0 && (
          <div className="card text-center">
            <p className="text-body">No contacts yet.</p>
            <p className="muted mt-1">Scan a badge or add someone manually to start your CRM list.</p>
          </div>
        )}
        {filtered.map((c) => {
          const d = new Date(c.metAt);
          const li = c.linkedin || linkedinSearchUrl(c.name, c.company);
          return (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={c.name} size={40} />
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-fg">{c.name}</p>
                    <p className="muted truncate">{[c.role, c.company].filter(Boolean).join(" · ")}</p>
                    <p className="text-xs text-muted">Met {fmtDay(d)} · {fmtTime(d)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    className="btn !px-2"
                    onClick={() => togglePin(c)}
                    aria-label={c.pinned ? "Unpin from top" : "Pin to top for follow-up"}
                    title={c.pinned ? "Pinned — tap to unpin" : "Pin to top for follow-up"}
                  >
                    <IconStar filled={!!c.pinned} size={18} className={c.pinned ? "text-star" : "text-muted"} />
                  </button>
                  <a className="btn !px-2" href={li} target="_blank" rel="noreferrer" aria-label="LinkedIn"><LinkedInIcon size={18} /></a>
                  <button className="btn !px-2" onClick={() => setMode({ kind: "edit", contact: c })} aria-label="Edit"><IconEdit size={18} /></button>
                  <button className="btn !px-2" onClick={() => handleDelete(c.id)} aria-label="Delete"><IconTrash size={18} /></button>
                </div>
              </div>
              {c.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                </div>
              )}
              {c.notes && <p className="mt-2 break-words text-sm text-body">{c.notes}</p>}
            </div>
          );
        })}
        {contacts.length > 0 && filtered.length === 0 && (
          <div className="card text-center"><p className="muted">No contacts match.</p></div>
        )}
      </div>
    </div>
  );
}
