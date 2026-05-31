"use client";

import Link from "next/link";
import { sessions } from "@/lib/data";
import { EVENT, fmtTime } from "@/lib/event";
import { classify } from "@/lib/agenda";
import { useNow } from "@/components/TimeProvider";
import { SessionCard } from "@/components/SessionCard";
import { RemindersCard } from "@/components/RemindersCard";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function NowPage() {
  const { now } = useNow();
  const { live, next, upcoming } = classify(sessions, now);
  const eventStart = new Date(sessions[0]?.start ?? EVENT.days[0]);
  const beforeEvent = now.getTime() < eventStart.getTime() && live.length === 0 && next.length === 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="muted">{EVENT.city}</p>
        <h1 className="text-2xl font-bold text-fg">Happening now</h1>
      </header>

      {live.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title flex items-center gap-2">
            <span className="live-dot h-2.5 w-2.5 rounded-full bg-live" /> Live now
          </h2>
          {live.map((s) => (
            <SessionCard key={s.id} session={s} state="live" />
          ))}
        </section>
      )}

      {next.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Up next · {fmtTime(new Date(next[0].start))}</h2>
          {next.map((s) => (
            <SessionCard key={s.id} session={s} state="next" />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Later</h2>
          {upcoming.slice(0, 4).map((s) => (
            <SessionCard key={s.id} session={s} state="upcoming" />
          ))}
          <Link href="/agenda" className="btn w-full">See full agenda →</Link>
        </section>
      )}

      {live.length === 0 && next.length === 0 && (
        <div className="card text-center">
          <p className="text-body">
            {beforeEvent ? "The event hasn't started yet." : "Nothing scheduled right now."}
          </p>
          <p className="muted mt-1">Browse the full agenda to plan your day.</p>
          <Link href="/agenda" className="btn btn-brand mt-3 inline-flex">Open agenda</Link>
        </div>
      )}

      <RemindersCard />
      <InstallPrompt />
    </div>
  );
}
