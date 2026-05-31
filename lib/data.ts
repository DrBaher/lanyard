// Loads seed content and exposes helpers that resolve the cross-links between
// sessions, speakers, and organizations.

import speakersJson from "@/data/speakers.json";
import orgsJson from "@/data/organizations.json";
import sessionsJson from "@/data/sessions.json";
import type { Organization, Session, Speaker } from "./types";

export const speakers: Speaker[] = speakersJson as Speaker[];
export const organizations: Organization[] = orgsJson as Organization[];
export const sessions: Session[] = (sessionsJson as Session[])
  .slice()
  .sort((a, b) => a.start.localeCompare(b.start));

const speakerById = new Map(speakers.map((s) => [s.id, s]));
const orgById = new Map(organizations.map((o) => [o.id, o]));
const sessionById = new Map(sessions.map((s) => [s.id, s]));

export const getSpeaker = (id: string) => speakerById.get(id);
export const getOrg = (id: string) => orgById.get(id);
export const getSession = (id: string) => sessionById.get(id);

export const getSpeakers = (ids: string[] = []) =>
  ids.map((id) => speakerById.get(id)).filter(Boolean) as Speaker[];
export const getOrgs = (ids: string[] = []) =>
  ids.map((id) => orgById.get(id)).filter(Boolean) as Organization[];

/** All sessions that feature a given speaker, sorted by time. */
export const sessionsForSpeaker = (speakerId: string): Session[] =>
  sessions.filter((s) => s.speakerIds?.includes(speakerId));

/** All sessions that feature a given organization, sorted by time. */
export const sessionsForOrg = (orgId: string): Session[] =>
  sessions.filter((s) => s.orgIds?.includes(orgId));

/** Speakers affiliated with an organization (via orgId link). */
export const speakersForOrg = (orgId: string): Speaker[] =>
  speakers.filter((s) => s.orgId === orgId);

export const companies = organizations.filter((o) => o.type === "company");
export const partners = organizations.filter((o) => o.type !== "company");
