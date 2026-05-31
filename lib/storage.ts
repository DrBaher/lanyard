// Local-first persistence for the things that belong to *you*: starred
// sessions and people you've met. Everything lives in localStorage on the
// device, which keeps networking-data offline-friendly and GDPR-clean.

import type { Contact } from "./types";

const STARS_KEY = "te.stars";
const CONTACTS_KEY = "te.contacts";
const TIME_OVERRIDE_KEY = "te.timeOverride";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  safeSetItem(key, JSON.stringify(value));
}

/**
 * localStorage.setItem that never throws. In Safari Private Browsing (and when
 * storage is blocked or over quota) setItem throws — callers must still update
 * their in-memory state, so persistence is strictly best-effort.
 */
export function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — keep going without persisting */
  }
}

// --- Starred / "My Schedule" sessions ---
export const getStars = (): string[] => read<string[]>(STARS_KEY, []);

export function toggleStar(sessionId: string): string[] {
  const cur = new Set(getStars());
  cur.has(sessionId) ? cur.delete(sessionId) : cur.add(sessionId);
  const next = [...cur];
  write(STARS_KEY, next);
  return next;
}

// --- Contacts ("Meet") ---
export const getContacts = (): Contact[] => read<Contact[]>(CONTACTS_KEY, []);

export function saveContact(contact: Contact): Contact[] {
  const all = getContacts();
  const idx = all.findIndex((c) => c.id === contact.id);
  if (idx >= 0) all[idx] = contact;
  else all.unshift(contact);
  write(CONTACTS_KEY, all);
  return all;
}

export function deleteContact(id: string): Contact[] {
  const next = getContacts().filter((c) => c.id !== id);
  write(CONTACTS_KEY, next);
  return next;
}

// --- Demo time override (lets you preview "happening now" before the event) ---
export const getTimeOverride = (): string | null =>
  read<string | null>(TIME_OVERRIDE_KEY, null);

export function setTimeOverride(iso: string | null) {
  if (iso) write(TIME_OVERRIDE_KEY, iso);
  else if (typeof window !== "undefined") window.localStorage.removeItem(TIME_OVERRIDE_KEY);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
