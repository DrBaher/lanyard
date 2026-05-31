"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { getOrg, speakersForOrg, sessionsForOrg } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { ResearchPanel } from "@/components/ResearchPanel";
import { getResearch } from "@/lib/research-data";
import { SessionCard } from "@/components/SessionCard";
import { stateFor } from "@/lib/agenda";
import { useNow } from "@/components/TimeProvider";

export default function CompanyDetail() {
  const { now } = useNow();
  const params = useParams<{ id: string }>();
  const org = getOrg(params.id);
  if (!org) return notFound();

  const people = speakersForOrg(org.id);
  const talks = sessionsForOrg(org.id);

  return (
    <div className="space-y-5">
      <Link href="/companies" className="muted -my-2 inline-flex min-h-[44px] items-center">← Companies & Partners</Link>

      <div className="flex items-start gap-4">
        <Avatar src={org.logo} name={org.name} size={72} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-fg">{org.name}</h1>
            {org.type !== "company" && <span className="chip capitalize">{org.type}</span>}
          </div>
          {org.tagline && <p className="muted">{org.tagline}</p>}
          {org.booth && <p className="text-xs text-muted">Booth {org.booth}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {org.website && (
          <a className="btn" href={org.website} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
      </div>

      <ResearchPanel
        research={getResearch(org.id)}
        kind="organization"
        name={org.name}
        context={org.tagline}
      />

      {org.topics && org.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {org.topics.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}

      {org.description && (
        <p className="text-sm leading-relaxed text-body">{org.description}</p>
      )}

      {people.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">People</h2>
          {people.map((p) => (
            <Link key={p.id} href={`/speakers/${p.id}`} className="card card-link flex items-center gap-3">
              <Avatar src={p.photo} name={p.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg">{p.name}</p>
                <p className="muted line-clamp-1">{p.title}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {talks.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Sessions</h2>
          {talks.map((s) => (
            <SessionCard key={s.id} session={s} state={stateFor(s, now)} />
          ))}
        </section>
      )}
    </div>
  );
}
