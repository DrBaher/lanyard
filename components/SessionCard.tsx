"use client";

import Link from "next/link";
import { useState } from "react";
import type { Session } from "@/lib/types";
import { getSpeakers, getOrgs, sessions as allSessions } from "@/lib/data";
import { fmtDay, fmtTime } from "@/lib/event";
import { starredConflicts } from "@/lib/agenda";
import { sessionsToIcs, downloadIcs } from "@/lib/ics";
import { IconCalendarPlus, IconStar, IconAlertTriangle } from "./Icons";
import { useStars } from "./StarsProvider";
import { Modal } from "./Modal";

export type SessionState = "live" | "next" | "past" | "upcoming";

export function SessionCard({
  session,
  state,
}: {
  session: Session;
  state?: SessionState;
}) {
  const { isStarred, toggle, stars } = useStars();
  const [open, setOpen] = useState(false);
  const speakers = getSpeakers(session.speakerIds);
  const orgs = getOrgs(session.orgIds);
  const start = new Date(session.start);
  const end = new Date(session.end);
  const starred = isStarred(session.id);
  const conflicts = starred ? starredConflicts(session, stars, allSessions) : [];

  const addToCalendar = () =>
    downloadIcs(
      `${session.id}.ics`,
      sessionsToIcs([session])
    );

  // Keep the row's own links/buttons from also opening the detail sheet.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`card cursor-pointer ${state === "live" ? "border-live/60" : ""} ${state === "past" ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{fmtTime(start)}–{fmtTime(end)}</span>
            {session.stage && <span className="chip">{session.stage}</span>}
            {(session.tags ?? []).slice(0, 2).map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
            {(session.tags?.length ?? 0) > 2 && (
              <span className="chip">+{(session.tags?.length ?? 0) - 2}</span>
            )}
            {state === "live" && (
              <span className="flex items-center gap-1 text-live">
                <span className="live-dot h-2 w-2 rounded-full bg-live" /> LIVE
              </span>
            )}
            {state === "next" && <span className="text-brand">Up next</span>}
          </div>
          <h3 className="mt-1">
            <button
              type="button"
              onClick={(e) => { stop(e); setOpen(true); }}
              className="text-left font-semibold text-fg hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {session.title}
            </button>
          </h3>
          {speakers.length > 0 && (
            <p className="mt-1 text-sm text-body">
              {speakers.map((s, i) => (
                <span key={s.id}>
                  <Link href={`/speakers/${s.id}`} onClick={stop} className="text-brand hover:underline">
                    {s.name}
                  </Link>
                  {i < speakers.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          )}
          {orgs.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {orgs.map((o, i) => (
                <span key={o.id}>
                  <Link href={`/companies/${o.id}`} onClick={stop} className="hover:underline">
                    {o.name}
                  </Link>
                  {i < orgs.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="-mr-2 -mt-2 flex shrink-0 items-start">
          <button
            aria-label="Add to calendar"
            title="Add to calendar"
            onClick={(e) => { stop(e); addToCalendar(); }}
            className="inline-flex h-11 w-11 items-center justify-center text-muted"
          >
            <IconCalendarPlus size={18} />
          </button>
          <button
            aria-label={starred ? "Unstar" : "Add to my schedule"}
            onClick={(e) => { stop(e); toggle(session.id); }}
            className={`inline-flex h-11 w-11 items-center justify-center ${starred ? "text-star" : "text-muted"}`}
          >
            <IconStar filled={starred} size={20} />
          </button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warn">
          <IconAlertTriangle size={13} className="shrink-0" />
          <span className="min-w-0 truncate">
            Overlaps {conflicts[0].title}
            {conflicts.length > 1 ? ` +${conflicts.length - 1} more` : ""}
          </span>
        </p>
      )}

      {session.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted">{session.description}</p>
      )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={session.title}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-body">{fmtDay(start)} · {fmtTime(start)}–{fmtTime(end)}</span>
            {session.stage && <span className="chip">{session.stage}</span>}
            {(session.tags ?? []).map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>

          {speakers.length > 0 && (
            <div className="space-y-1">
              <p className="muted">{speakers.length > 1 ? "Speakers" : "Speaker"}</p>
              <div className="flex flex-col items-start gap-1">
                {speakers.map((s) => (
                  <Link key={s.id} href={`/speakers/${s.id}`} className="text-brand hover:underline">
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {session.description ? (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-body">{session.description}</p>
          ) : (
            <p className="muted">No description published for this session yet.</p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-edge pt-3">
            <button className="btn" onClick={() => toggle(session.id)}>
              <IconStar filled={starred} size={17} /> {starred ? "On my schedule" : "Add to schedule"}
            </button>
            <button className="btn" onClick={addToCalendar}>
              <IconCalendarPlus size={17} /> Add to calendar
            </button>
            {session.sourceUrl && (
              <a className="btn" href={session.sourceUrl} target="_blank" rel="noreferrer">
                View session page ↗
              </a>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
