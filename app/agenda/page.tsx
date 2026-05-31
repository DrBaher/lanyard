"use client";

import { useMemo, useState } from "react";
import { sessions } from "@/lib/data";
import { EVENT, eventDateKey, fmtDay } from "@/lib/event";
import { stateFor } from "@/lib/agenda";
import { sessionsToIcs, downloadIcs } from "@/lib/ics";
import { useNow } from "@/components/TimeProvider";
import { useStars } from "@/components/StarsProvider";
import { SessionCard } from "@/components/SessionCard";
import { SearchBar } from "@/components/SearchBar";
import { IconStar, IconCalendarPlus } from "@/components/Icons";

export default function AgendaPage() {
  const { now } = useNow();
  const { stars } = useStars();
  const [day, setDay] = useState<string>(EVENT.days[0]);
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<string>("");
  const [mineOnly, setMineOnly] = useState(false);

  // Topic tags across the program, most-used first.
  const tracks = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of sessions) for (const t of s.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, []);

  const starred = useMemo(
    () =>
      sessions
        .filter((s) => stars.has(s.id))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [stars]
  );

  const exportSchedule = () =>
    downloadIcs("my-tech-2026-schedule.ics", sessionsToIcs(starred));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      if (eventDateKey(new Date(s.start)) !== day) return false;
      if (track && !(s.tags ?? []).includes(track)) return false;
      if (mineOnly && !stars.has(s.id)) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.stage?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [day, query, track, mineOnly, stars]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-fg">Agenda</h1>
        <p className="muted">{EVENT.name} · {EVENT.city}</p>
      </header>

      <div className="flex gap-2">
        {EVENT.days.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`btn flex-1 ${day === d ? "btn-brand" : ""}`}
          >
            {fmtDay(new Date(`${d}T12:00:00+02:00`))}
          </button>
        ))}
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="Search sessions, stages, topics…" />

      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setMineOnly((m) => !m)}
          className={`chip shrink-0 gap-1 ${mineOnly ? "border-star text-star" : ""}`}
        >
          <IconStar filled={mineOnly} size={13} /> My schedule
        </button>
        <button onClick={() => setTrack("")} className={`chip shrink-0 ${!track ? "border-brand text-brand" : ""}`}>
          All topics
        </button>
        {tracks.map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            className={`chip shrink-0 ${track === t ? "border-brand text-brand" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {starred.length > 0 && (
        <button className="btn w-full" onClick={exportSchedule}>
          <IconCalendarPlus size={17} /> Add my schedule to calendar ({starred.length})
        </button>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center"><p className="muted">No sessions match.</p></div>
        )}
        {filtered.map((s) => (
          <SessionCard key={s.id} session={s} state={stateFor(s, now)} />
        ))}
      </div>
    </div>
  );
}
