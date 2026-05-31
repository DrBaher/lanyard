"use client";

import { useState } from "react";
import type { Contact } from "@/lib/types";
import { newId } from "@/lib/storage";
import { linkedinSearchUrl } from "@/lib/linkedin";
import { ResearchButton } from "./ResearchButton";
import { LinkedInIcon } from "./LinkedInIcon";

const SUGGESTED_TAGS = ["Follow up", "Hot lead", "Investor", "Hiring", "Partner", "Friend"];

export function ContactForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Contact>;
  onSave: (c: Contact) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [company, setCompany] = useState(initial.company ?? "");
  const [role, setRole] = useState(initial.role ?? "");
  const [linkedin, setLinkedin] = useState(initial.linkedin ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);

  function toggleTag(t: string) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: initial.id ?? newId(),
      name: name.trim() || "Unknown",
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim(),
      tags,
      metAt: initial.metAt ?? new Date().toISOString(),
      source: initial.source ?? "manual",
      raw: initial.raw,
    });
  }

  const liUrl = linkedin.trim() || linkedinSearchUrl(name, company);

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="input" placeholder="Name" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <input className="input" placeholder="Company" aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        <input className="input" placeholder="Role" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <input className="input" placeholder="LinkedIn URL (optional)" aria-label="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
      <input className="input" type="email" placeholder="Email (optional)" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_TAGS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => toggleTag(t)}
            className={`chip ${tags.includes(t) ? "border-brand text-brand" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <textarea
        className="input !min-h-[96px]"
        placeholder="Notes from your conversation…"
        aria-label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <a className="btn" href={liUrl} target="_blank" rel="noreferrer" aria-label={linkedin.trim() ? "Open LinkedIn profile" : "Find on LinkedIn"}>
          <LinkedInIcon /> {linkedin.trim() ? "Open" : "Find"}
        </a>
        <ResearchButton kind="contact" name={name || "this person"} context={[role, company].filter(Boolean).join(", ")} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-brand flex-1">Save contact</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
