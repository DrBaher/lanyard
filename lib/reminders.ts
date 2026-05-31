// Local session reminders via the Notification API.
//
// Honest scope: real *background* push needs a server (Web Push) which this
// app intentionally doesn't run. Instead we schedule in-page timers and fire a
// notification (through the service worker when available, so it shows on the
// lock screen on supported platforms) while the app is open. Good enough for an
// event companion you keep in hand; documented as such in the UI.

export const REMINDER_ENABLED_KEY = "te.reminders.enabled";
export const REMINDER_LEAD_KEY = "te.reminders.lead";
export const DEFAULT_LEAD = 10;

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function notify(title: string, body: string, tag?: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const opts: NotificationOptions = { body, icon: "/icon.svg", badge: "/icon.svg", tag };
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, opts);
      return;
    }
  } catch {
    /* fall through to the page-level Notification */
  }
  new Notification(title, opts);
}

// --- Background reminders via the Notification Triggers API ---
// Where supported (Chromium), the service worker can fire a notification at a
// future timestamp even when the app is fully closed — true background nudges.
// Everywhere else we silently rely on the in-page timers (foreground only).

const TAG_PREFIX = "reminder:";

export function triggersSupported(): boolean {
  return (
    notificationsSupported() &&
    "serviceWorker" in navigator &&
    "showTrigger" in Notification.prototype &&
    typeof (window as unknown as { TimestampTrigger?: unknown }).TimestampTrigger !== "undefined"
  );
}

export interface ReminderItem {
  id: string;
  title: string;
  stage?: string;
  start: string;
}

async function pendingReminderNotifications() {
  const reg = await navigator.serviceWorker?.ready.catch(() => null);
  if (!reg) return { reg: null, notes: [] as Notification[] };
  const notes = await reg
    .getNotifications({ includeTriggered: true } as NotificationOptions)
    .catch(() => [] as Notification[]);
  return { reg, notes: notes.filter((n) => n.tag?.startsWith(TAG_PREFIX)) };
}

/** (Re)schedule background notifications for the given upcoming items. */
export async function scheduleBackgroundReminders(
  items: ReminderItem[],
  leadMinutes: number,
  fmt: (d: Date) => string
): Promise<void> {
  if (!triggersSupported() || Notification.permission !== "granted") return;
  const { reg, notes } = await pendingReminderNotifications();
  if (!reg) return;
  notes.forEach((n) => n.close()); // clear stale schedule

  const now = Date.now();
  const TimestampTrigger = (window as unknown as { TimestampTrigger: new (t: number) => unknown })
    .TimestampTrigger;
  for (const it of items) {
    const fireAt = new Date(it.start).getTime() - leadMinutes * 60_000;
    if (fireAt <= now) continue;
    try {
      await reg.showNotification(`Starting soon · ${fmt(new Date(it.start))}`, {
        body: `${it.title}${it.stage ? ` — ${it.stage}` : ""}`,
        tag: `${TAG_PREFIX}${it.id}`,
        icon: "/icon.svg",
        badge: "/icon.svg",
        showTrigger: new TimestampTrigger(fireAt),
      } as NotificationOptions);
    } catch {
      /* unsupported edge / quota — best-effort */
    }
  }
}

export async function clearBackgroundReminders(): Promise<void> {
  const { notes } = await pendingReminderNotifications();
  notes.forEach((n) => n.close());
}
