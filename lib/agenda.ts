import type { Session } from "./types";
import type { SessionState } from "@/components/SessionCard";

export interface Classified {
  live: Session[];
  next: Session[];
  upcoming: Session[];
  past: Session[];
}

/** Split sessions relative to `now` for the time-aware views. */
export function classify(sessions: Session[], now: Date): Classified {
  const t = now.getTime();
  const live: Session[] = [];
  const future: Session[] = [];
  const past: Session[] = [];

  for (const s of sessions) {
    const start = new Date(s.start).getTime();
    const end = new Date(s.end).getTime();
    if (t >= start && t < end) live.push(s);
    else if (t < start) future.push(s);
    else past.push(s);
  }

  future.sort((a, b) => a.start.localeCompare(b.start));
  // "Up next" = everything starting at the earliest upcoming start time.
  const nextStart = future[0]?.start;
  const next = nextStart ? future.filter((s) => s.start === nextStart) : [];
  const upcoming = nextStart ? future.filter((s) => s.start !== nextStart) : [];

  return { live, next, upcoming, past };
}

export function stateFor(s: Session, now: Date): SessionState {
  const start = new Date(s.start).getTime();
  const end = new Date(s.end).getTime();
  const t = now.getTime();
  if (t >= start && t < end) return "live";
  if (t < start) return "upcoming";
  return "past";
}

/** Do two sessions' time windows overlap (touching edges don't count)? */
export function overlaps(a: Session, b: Session): boolean {
  const aStart = new Date(a.start).getTime();
  const aEnd = new Date(a.end).getTime();
  const bStart = new Date(b.start).getTime();
  const bEnd = new Date(b.end).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Other *starred* sessions whose time clashes with `session`. Empty unless the
 * session itself is starred — we only warn about conflicts within My Schedule.
 */
export function starredConflicts(
  session: Session,
  starIds: Set<string>,
  all: Session[]
): Session[] {
  if (!starIds.has(session.id)) return [];
  return all.filter(
    (s) => s.id !== session.id && starIds.has(s.id) && overlaps(session, s)
  );
}
