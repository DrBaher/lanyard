// Core domain types for the event companion app.
// All event content (speakers/orgs/sessions) is seeded from /data/*.json so it
// can be hand-edited and committed as the real program is published.

export type OrgType = "company" | "partner" | "sponsor";

export interface SocialLinks {
  linkedin?: string;
  x?: string;
  website?: string;
}

export interface Speaker {
  id: string;
  name: string;
  title?: string;
  /** Free-text affiliation shown on cards. */
  company?: string;
  /** Optional link to an organization in organizations.json for cross-nav. */
  orgId?: string;
  bio?: string;
  photo?: string;
  topics?: string[];
  links?: SocialLinks;
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  tagline?: string;
  description?: string;
  logo?: string;
  website?: string;
  /** Booth / location label at the venue, if any. */
  booth?: string;
  topics?: string[];
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  /** ISO 8601 with timezone offset, e.g. 2026-06-16T09:30:00+02:00 */
  start: string;
  end: string;
  stage?: string;
  /** Primary topic tag (first of `tags`); kept for the calendar export line. */
  track?: string;
  /** All topic tags the program assigns to this session. */
  tags?: string[];
  speakerIds?: string[];
  orgIds?: string[];
  /** Link to the session's page on the event website, when available. */
  sourceUrl?: string;
}

/** A person you met — stored locally on the device (never on a server). */
export interface Contact {
  id: string;
  name: string;
  company?: string;
  role?: string;
  linkedin?: string;
  email?: string;
  notes: string;
  tags: string[];
  /** ISO timestamp of when you met them. */
  metAt: string;
  source: "scan" | "manual";
  /** Raw decoded badge payload, kept for reference. */
  raw?: string;
  /** Pinned ("follow up") contacts float to the top of the Meet list. */
  pinned?: boolean;
}
