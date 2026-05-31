"use client";

import { useReminders } from "./RemindersProvider";
import { IconBell } from "./Icons";

const LEADS = [5, 10, 15, 30];

export function RemindersCard() {
  const r = useReminders();

  // Nothing to show on browsers without the Notification API.
  if (!r.supported) return null;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-fg"><IconBell size={17} /> Session reminders</p>
          <p className="muted">
            {r.enabled
              ? `On · ${r.scheduledCount} upcoming starred session${r.scheduledCount === 1 ? "" : "s"}`
              : "Get a nudge before your starred talks start"}
          </p>
        </div>
        {r.enabled ? (
          <button className="btn shrink-0" onClick={r.disable}>Turn off</button>
        ) : (
          <button className="btn btn-brand shrink-0" onClick={r.enable}>Enable</button>
        )}
      </div>

      {r.enabled && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="muted">Remind me</span>
            {LEADS.map((m) => (
              <button
                key={m}
                className={`chip ${r.leadMinutes === m ? "border-brand text-brand" : ""}`}
                onClick={() => r.setLeadMinutes(m)}
              >
                {m} min before
              </button>
            ))}
          </div>
          <button className="btn" onClick={r.sendTest}>Send a test</button>
          <p className="text-xs text-muted">
            {r.backgroundCapable
              ? "Nudges fire even when the app is closed on this device. Add it to your home screen so they keep arriving."
              : "Reminders fire while the app is open. Add it to your home screen, or use “Add to calendar” on a session for an alarm that works in the background."}
          </p>
        </>
      )}

      {r.permission === "denied" && (
        <p className="text-xs text-danger">
          Notifications are blocked — enable them for this site in your browser settings.
        </p>
      )}
    </div>
  );
}
