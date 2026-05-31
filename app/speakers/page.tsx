"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { speakers } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { SearchBar } from "@/components/SearchBar";

export default function SpeakersPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...speakers].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.company?.toLowerCase().includes(q) ||
        s.title?.toLowerCase().includes(q) ||
        s.topics?.some((t) => t.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-fg">Speakers</h1>
        <p className="muted">{speakers.length} people on stage</p>
      </header>

      <SearchBar value={query} onChange={setQuery} placeholder="Search speakers, companies, topics…" />

      <div className="space-y-3">
        {filtered.map((s) => (
          <Link key={s.id} href={`/speakers/${s.id}`} className="card card-link flex items-center gap-3">
            <Avatar src={s.photo} name={s.name} />
            <div className="min-w-0">
              <p className="font-semibold text-fg">{s.name}</p>
              <p className="muted line-clamp-1">
                {[s.title, s.company].filter(Boolean).join(" · ")}
              </p>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center"><p className="muted">No speakers match.</p></div>
        )}
      </div>
    </div>
  );
}
