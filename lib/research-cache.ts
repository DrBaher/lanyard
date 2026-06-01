// Optional shared, server-side cache for live research dossiers, backed by an
// Upstash-compatible Redis REST API (Upstash directly, or Vercel KV / Vercel's
// Upstash Marketplace integration). A dossier about a public speaker or company
// is identical for every attendee, so caching it server-side means the first
// lookup pays for the Claude + web-search call and everyone else gets it
// instantly and for free.
//
// Contacts ("a person I just met") are deliberately NEVER cached here — they
// are private and stay on the requester's own device (see SECURITY.md). The
// route enforces this by only calling the cache for speakers/organizations.
//
// Fully optional: with no KV env configured this is a no-op and the route just
// generates on demand. Any KV error is swallowed — research must never break
// because the cache is unavailable.

const KV_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

// Bump to invalidate every cached dossier at once (e.g. after a prompt change
// that improves output quality). Cheaper and safer than flushing the store.
const CACHE_VERSION = "v1";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — speaker/company info is slow-moving

export interface CachedDossier {
  summary: string;
  bullets: string[];
}

export function cacheConfigured(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

export function keyFor(kind: string, name: string, context?: string): string {
  return `research:${CACHE_VERSION}:${kind}|${name}|${context ?? ""}`.toLowerCase();
}

// Send one Redis command via the REST API (POST base URL, command as a JSON
// array body) so keys/values with arbitrary characters need no URL-escaping.
async function command(args: string[]): Promise<unknown> {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${KV_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    // Never let a slow/unreachable cache hold up the request for long.
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return data.result;
}

export async function getCached(
  kind: string,
  name: string,
  context?: string
): Promise<CachedDossier | null> {
  if (!cacheConfigured()) return null;
  try {
    const raw = await command(["GET", keyFor(kind, name, context)]);
    if (typeof raw !== "string") return null;
    const parsed = JSON.parse(raw) as CachedDossier;
    return parsed && typeof parsed.summary === "string"
      ? { summary: parsed.summary, bullets: parsed.bullets ?? [] }
      : null;
  } catch {
    return null; // miss on any error — fall through to live generation
  }
}

export async function setCached(
  kind: string,
  name: string,
  context: string | undefined,
  dossier: CachedDossier
): Promise<void> {
  if (!cacheConfigured()) return;
  try {
    await command([
      "SET",
      keyFor(kind, name, context),
      JSON.stringify(dossier),
      "EX",
      String(TTL_SECONDS),
    ]);
  } catch {
    /* best-effort: a failed write just means the next caller regenerates */
  }
}
