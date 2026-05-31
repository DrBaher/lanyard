// Shared helpers for the data importers (scripts/import/*).
// Importers read a schedule source and write the app's data/*.json shape
// (see lib/types.ts). Run with `node scripts/import/<name>.mjs <source>`.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Load .env.local / .env into process.env (without overriding existing vars),
 *  so the LLM-assisted importers find ANTHROPIC_API_KEY like the app does. */
export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      const key = m[1];
      const val = m[2].replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

export function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Read a local file path or an http(s) URL into a string. */
export async function readSource(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`fetch ${src} → ${res.status}`);
    return await res.text();
  }
  return readFileSync(src, "utf8");
}

/** Write data/<name>.json (or to a custom --out dir for testing). */
export function writeData(name, value, outDir) {
  const dir = outDir || path.join(ROOT, "data");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  return file;
}

/** Parse common CLI flags: positional source + --out <dir> + --enrich + --tz. */
export function parseArgs(argv) {
  const args = { _: [], enrich: false, out: undefined, tz: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--enrich") args.enrich = true;
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--tz") args.tz = argv[++i];
    else args._.push(a);
  }
  return args;
}

// --- Timezone math (no dependencies) ---

function tzOffsetMinutes(utcMs, tz) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(utcMs))
    .reduce((acc, x) => ((acc[x.type] = x.value), acc), {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUTC - utcMs) / 60000;
}

/** A wall-clock local time in an IANA timezone → the absolute instant (Date). */
export function zonedToInstant(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  // Two passes so DST transitions resolve correctly.
  let utc = guess - tzOffsetMinutes(guess, tz) * 60000;
  utc = guess - tzOffsetMinutes(utc, tz) * 60000;
  return new Date(utc);
}

/** Light validation + a summary to stderr; returns the data unchanged. */
export function summarize({ sessions = [], speakers = [], organizations = [] }) {
  const spkIds = new Set(speakers.map((s) => s.id));
  const orgIds = new Set(organizations.map((o) => o.id));
  let dangling = 0;
  for (const s of sessions) {
    for (const id of s.speakerIds || []) if (!spkIds.has(id)) dangling++;
    for (const id of s.orgIds || []) if (!orgIds.has(id)) dangling++;
  }
  console.error(`✓ ${sessions.length} sessions, ${speakers.length} speakers, ${organizations.length} orgs`);
  if (dangling) console.error(`  ⚠ ${dangling} speaker/org references don't resolve`);
  const days = [...new Set(sessions.map((s) => (s.start || "").slice(0, 10)).filter(Boolean))].sort();
  if (days.length) console.error(`  → set event.config.ts days to (verify in your timezone): ${JSON.stringify(days)}`);
}
