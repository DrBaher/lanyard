"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { getSpeaker, getOrg, sessionsForSpeaker } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { ResearchPanel } from "@/components/ResearchPanel";
import { getResearch } from "@/lib/research-data";
import { LinkedInIcon } from "@/components/LinkedInIcon";
import { SessionCard } from "@/components/SessionCard";
import { stateFor } from "@/lib/agenda";
import { useNow } from "@/components/TimeProvider";

export default function SpeakerDetail() {
  const { now } = useNow();
  const params = useParams<{ id: string }>();
  const speaker = getSpeaker(params.id);
  if (!speaker) return notFound();

  const org = speaker.orgId ? getOrg(speaker.orgId) : undefined;
  const talks = sessionsForSpeaker(speaker.id);

  return (
    <div className="space-y-5">
      <Link href="/speakers" className="muted -my-2 inline-flex min-h-[44px] items-center">← Speakers</Link>

      <div className="flex items-start gap-4">
        <Avatar src={speaker.photo} name={speaker.name} size={72} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg">{speaker.name}</h1>
          <p className="muted">{[speaker.title, speaker.company].filter(Boolean).join(" · ")}</p>
          {org && (
            <Link href={`/companies/${org.id}`} className="mt-1 inline-block text-sm text-brand hover:underline">
              View {org.name} →
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {speaker.links?.linkedin && (
          <a className="btn" href={speaker.links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn profile">
            <LinkedInIcon /> Profile
          </a>
        )}
        {speaker.links?.website && (
          <a className="btn" href={speaker.links.website} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
      </div>

      <ResearchPanel
        research={getResearch(speaker.id)}
        kind="speaker"
        name={speaker.name}
        context={[speaker.title, speaker.company].filter(Boolean).join(", ")}
      />

      {speaker.topics && speaker.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {speaker.topics.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}

      {speaker.bio && <p className="text-sm leading-relaxed text-body">{speaker.bio}</p>}

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
