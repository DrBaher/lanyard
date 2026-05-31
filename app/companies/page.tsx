"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { organizations } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { SearchBar } from "@/components/SearchBar";

type Filter = "all" | "company" | "partner";

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...organizations]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((o) => {
        if (filter === "company" && o.type !== "company") return false;
        if (filter === "partner" && o.type === "company") return false;
        if (!q) return true;
        return (
          o.name.toLowerCase().includes(q) ||
          o.tagline?.toLowerCase().includes(q) ||
          o.topics?.some((t) => t.toLowerCase().includes(q))
        );
      });
  }, [query, filter]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-fg">Companies & Partners</h1>
        <p className="muted">{organizations.length} exhibitors & partners</p>
      </header>

      <SearchBar value={query} onChange={setQuery} placeholder="Search companies, partners, topics…" />

      <div className="flex gap-2">
        {(["all", "company", "partner"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn flex-1 ${filter === f ? "btn-brand" : ""}`}
          >
            {f === "all" ? "All" : f === "company" ? "Companies" : "Partners"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <Link key={o.id} href={`/companies/${o.id}`} className="card card-link flex items-center gap-3">
            <Avatar src={o.logo} name={o.name} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-fg">{o.name}</p>
                {o.type !== "company" && <span className="chip capitalize">{o.type}</span>}
              </div>
              {o.tagline && <p className="muted truncate">{o.tagline}</p>}
              {o.booth && <p className="text-xs text-muted">Booth {o.booth}</p>}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center"><p className="muted">No organizations match.</p></div>
        )}
      </div>
    </div>
  );
}
