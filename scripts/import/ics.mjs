// Import an iCalendar (.ics) feed → data/sessions.json
//
//   node scripts/import/ics.mjs <file-or-url> [--out dir] [--enrich]
//
// ICS rarely carries speakers/organizations, so this writes sessions only.
// Pass --enrich to let Claude infer topic tags from titles/descriptions
// (requires ANTHROPIC_API_KEY).
import { readSource, writeData, slugify, zonedToInstant, summarize, parseArgs } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const src = args._[0];
if (!src) {
  console.error("usage: node scripts/import/ics.mjs <file-or-url> [--out dir] [--enrich]");
  process.exit(1);
}

function unfold(text) {
  // RFC 5545: a CRLF followed by a space/tab continues the previous line.
  return text.replace(/\r?\n[ \t]/g, "");
}

function unescapeText(v) {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// "20260601T090000Z" | "20260601T090000" | "20260601" → absolute Date.
function parseDt(value, params) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  const Y = +y, Mo = +mo, D = +d, H = +h, Mi = +mi, S = +s;
  if (z) return new Date(Date.UTC(Y, Mo - 1, D, H, Mi, S)); // UTC
  if (params.TZID) return zonedToInstant(Y, Mo, D, H, Mi, S, params.TZID); // zoned
  // Date-only or floating local time: treat as UTC (best-effort) and warn once.
  floatingWarned ||= (console.error("  ⚠ some times had no timezone; treated as UTC"), true);
  return new Date(Date.UTC(Y, Mo - 1, D, H, Mi, S));
}
let floatingWarned = false;

const text = unfold(await readSource(src));
const lines = text.split(/\r?\n/);

const sessions = [];
let cur = null;
const seen = new Set();
for (const line of lines) {
  if (line === "BEGIN:VEVENT") { cur = {}; continue; }
  if (line === "END:VEVENT") {
    if (cur && cur.title && cur.start) {
      const id = cur.uid ? "ses-" + slugify(cur.uid) : "ses-" + slugify(`${cur.title}-${cur.start.toISOString()}`);
      if (!seen.has(id)) {
        seen.add(id);
        const tags = cur.categories?.length ? cur.categories : undefined;
        sessions.push({
          id,
          title: cur.title,
          start: cur.start.toISOString(),
          end: (cur.end || cur.start).toISOString(),
          ...(cur.location ? { stage: cur.location } : {}),
          ...(tags ? { track: tags[0], tags } : {}),
          ...(cur.description ? { description: cur.description } : {}),
          ...(cur.url ? { sourceUrl: cur.url } : {}),
        });
      }
    }
    cur = null;
    continue;
  }
  if (!cur) continue;
  const idx = line.indexOf(":");
  if (idx < 0) continue;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const [name, ...paramParts] = left.split(";");
  const params = Object.fromEntries(paramParts.map((p) => p.split("=")).filter((kv) => kv.length === 2));
  switch (name.toUpperCase()) {
    case "SUMMARY": cur.title = unescapeText(value).trim(); break;
    case "DESCRIPTION": cur.description = unescapeText(value).trim(); break;
    case "LOCATION": cur.location = unescapeText(value).trim(); break;
    case "URL": cur.url = value.trim(); break;
    case "UID": cur.uid = value.trim(); break;
    case "CATEGORIES":
      cur.categories = (cur.categories || []).concat(unescapeText(value).split(",").map((t) => t.trim()).filter(Boolean));
      break;
    case "DTSTART": cur.start = parseDt(value.trim(), params); break;
    case "DTEND": cur.end = parseDt(value.trim(), params); break;
  }
}

sessions.sort((a, b) => a.start.localeCompare(b.start));

if (args.enrich) {
  const { enrichTags } = await import("./llm.mjs");
  await enrichTags(sessions);
}

writeData("sessions", sessions, args.out);
summarize({ sessions });
console.error("note: ICS has no speaker/company data — speakers.json & organizations.json were left unchanged.");
