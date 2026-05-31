// Import a Pretalx / frab / Pentabarf "schedule.json" → data/*.json
//
//   node scripts/import/frab.mjs <file-or-url> [--out dir] [--enrich]
//
// This is the open schedule format exported by Pretalx and many community
// conferences. It carries sessions + speakers (as "persons"); organizations
// aren't part of the format, so organizations.json is emptied.
import { readSource, writeData, slugify, summarize, parseArgs } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const src = args._[0];
if (!src) {
  console.error("usage: node scripts/import/frab.mjs <file-or-url> [--out dir] [--enrich]");
  process.exit(1);
}

function durationMinutes(d) {
  if (!d) return 60;
  const [h, m] = String(d).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const raw = JSON.parse(await readSource(src));
const conf = raw?.schedule?.conference;
if (!conf?.days) {
  console.error("error: not a frab/Pretalx schedule.json (missing schedule.conference.days)");
  process.exit(1);
}

const sessions = [];
const speakersById = new Map();

for (const day of conf.days) {
  const rooms = day.rooms || {};
  for (const [roomName, events] of Object.entries(rooms)) {
    for (const ev of events) {
      // Prefer the full ISO `date`; fall back to combining day.date + start.
      const startIso = ev.date || (day.date && ev.start ? `${day.date}T${ev.start}:00` : null);
      if (!ev.title || !startIso) continue;
      const start = new Date(startIso);
      if (isNaN(start)) continue;
      const end = new Date(start.getTime() + durationMinutes(ev.duration) * 60000);

      const speakerIds = (ev.persons || [])
        .map((p) => (p.public_name || p.name || "").trim())
        .filter(Boolean)
        .map((name) => {
          const id = "spk-" + slugify(name);
          if (!speakersById.has(id)) speakersById.set(id, { id, name });
          return id;
        });

      const tags = ev.track ? [String(ev.track)] : undefined;
      sessions.push({
        id: "ses-" + slugify(String(ev.guid || ev.id || `${ev.title}-${startIso}`)),
        title: ev.title.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
        ...(ev.room || roomName ? { stage: ev.room || roomName } : {}),
        ...(tags ? { track: tags[0], tags } : {}),
        ...(ev.abstract || ev.description ? { description: (ev.abstract || ev.description).trim() } : {}),
        ...(ev.url ? { sourceUrl: ev.url } : {}),
        ...(speakerIds.length ? { speakerIds } : {}),
      });
    }
  }
}

sessions.sort((a, b) => a.start.localeCompare(b.start));
const speakers = [...speakersById.values()].sort((a, b) => a.name.localeCompare(b.name));

if (args.enrich) {
  const { enrichTags } = await import("./llm.mjs");
  await enrichTags(sessions);
}

writeData("sessions", sessions, args.out);
writeData("speakers", speakers, args.out);
writeData("organizations", [], args.out);
summarize({ sessions, speakers });
console.error("note: frab has no organizations — organizations.json was emptied.");
