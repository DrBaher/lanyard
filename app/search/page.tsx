"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { speakers, organizations, sessions } from "@/lib/data";
import { stateFor } from "@/lib/agenda";
import { useNow } from "@/components/TimeProvider";
import { SearchBar } from "@/components/SearchBar";
import { SessionCard } from "@/components/SessionCard";
import { Avatar } from "@/components/Avatar";

export default function SearchPage() {
  const { now } = useNow();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return null;
    const has = (...parts: (string | undefined)[]) =>
      parts.filter(Boolean).join(" ").toLowerCase().includes(query);
    return {
      speakers: speakers.filter((s) => has(s.name, s.title, s.company)).slice(0, 25),
      orgs: organizations.filter((o) => has(o.name, o.tagline, o.description)).slice(0, 25),
      sessions: sessions
        .filter((s) => has(s.title, s.stage, ...(s.tags ?? [])))
        .slice(0, 40),
    };
  }, [query]);

  const total = results ? results.speakers.length + results.orgs.length + results.sessions.length : 0;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-fg">Search</h1>
        <p className="muted">Sessions, speakers and companies — all at once.</p>
      </header>

      <SearchBar value={q} onChange={setQ} placeholder="Search the whole event…" autoFocus />

      {!results && (
        <p className="muted">Type to search across the program, speakers and companies.</p>
      )}
      {results && total === 0 && (
        <div className="card text-center"><p className="muted">No matches for “{q.trim()}”.</p></div>
      )}

      {results && results.speakers.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title">Speakers · {results.speakers.length}</h2>
          {results.speakers.map((s) => (
            <Link key={s.id} href={`/speakers/${s.id}`} className="card card-link flex items-center gap-3">
              <Avatar src={s.photo} name={s.name} />
              <div className="min-w-0">
                <p className="font-semibold text-fg">{s.name}</p>
                <p className="muted line-clamp-1">{[s.title, s.company].filter(Boolean).join(" · ")}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {results && results.orgs.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title">Companies · {results.orgs.length}</h2>
          {results.orgs.map((o) => (
            <Link key={o.id} href={`/companies/${o.id}`} className="card card-link flex items-center gap-3">
              <Avatar src={o.logo} name={o.name} />
              <div className="min-w-0">
                <p className="font-semibold text-fg">{o.name}</p>
                {o.tagline && <p className="muted line-clamp-1">{o.tagline}</p>}
              </div>
            </Link>
          ))}
        </section>
      )}

      {results && results.sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Sessions · {results.sessions.length}</h2>
          {results.sessions.map((s) => (
            <SessionCard key={s.id} session={s} state={stateFor(s, now)} />
          ))}
        </section>
      )}
    </div>
  );
}
