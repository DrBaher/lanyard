// Client helper for the "Research" buttons. It posts a subject to the
// server-side /api/research route, which currently returns a STUB. When you
// add a provider + key (see app/api/research/route.ts), the same UI lights up
// with real summaries — no frontend changes needed.

export type ResearchKind = "speaker" | "organization" | "contact";

export interface ResearchResult {
  summary: string;
  bullets?: string[];
  stub: boolean;
  /** True when this result was served from the local cache. */
  cached?: boolean;
}

// Cache real results on-device so re-tapping a subject is instant, costs
// nothing, and still works offline. Keyed by subject; kept for the event week.
//
// Bump CACHE_VERSION to invalidate every device's cached dossiers at once (e.g.
// after a change to how dossiers are generated). Older-version entries are
// ignored and swept from localStorage on next use.
const CACHE_ROOT = "te.research.";
const CACHE_VERSION = "v2";
const CACHE_PREFIX = `${CACHE_ROOT}${CACHE_VERSION}.`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// One-time-per-load purge of entries written by an older cache version.
let swept = false;
function sweepOldVersions() {
  if (swept || typeof window === "undefined") return;
  swept = true;
  try {
    const drop: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHE_ROOT) && !k.startsWith(CACHE_PREFIX)) drop.push(k);
    }
    drop.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* best-effort — a stale entry left behind is harmless */
  }
}

function cacheKey(kind: ResearchKind, name: string, context?: string): string {
  return `${CACHE_PREFIX}${kind}|${name}|${context ?? ""}`.toLowerCase();
}

function readCache(key: string): ResearchResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const { ts, result } = JSON.parse(raw) as { ts: number; result: ResearchResult };
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return { ...result, cached: true };
  } catch {
    return null;
  }
}

function writeCache(key: string, result: ResearchResult) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ ts: Date.now(), result }));
  } catch {
    /* quota / private mode — caching is best-effort */
  }
}

// Dossier summaries are stored as one block, with distinct points joined by
// " - " (a spaced hyphen). Genuine dashes in the prose use an em-dash (—), so
// splitting on the spaced hyphen safely recovers readable paragraphs.
export function summaryParagraphs(summary: string): string[] {
  return summary
    .split(/\s+-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function research(
  kind: ResearchKind,
  subject: { name: string; context?: string }
): Promise<ResearchResult> {
  sweepOldVersions();
  const key = cacheKey(kind, subject.name, subject.context);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Shared group key — gates the paid endpoint against drive-by hits.
        "x-app-key": process.env.NEXT_PUBLIC_GROUP_CODE || "",
      },
      body: JSON.stringify({ kind, ...subject }),
    });
    if (!res.ok) throw new Error(`Research failed (${res.status})`);
    const result = (await res.json()) as ResearchResult;
    // Only persist real, useful answers — never the stub or empty results.
    if (!result.stub && result.summary) writeCache(key, result);
    return result;
  } catch (err) {
    // Offline / network failure: fall back to any cached copy, even if stale.
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        try {
          const { result } = JSON.parse(raw) as { result: ResearchResult };
          return { ...result, cached: true };
        } catch {
          /* ignore */
        }
      }
    }
    throw err;
  }
}
