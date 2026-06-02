#!/usr/bin/env node
// Validate data/*.json before it ships. The app imports this data with a blind
// cast (lib/data.ts: `speakersJson as Speaker[]`), so without this gate a lossy
// import, a dangling reference, or a dead photo URL reaches production unnoticed.
//
//   npm run validate                # integrity (hard errors) + heuristics (warnings)
//   node scripts/validate-data.mjs --check-links   # also HEAD-request photo URLs
//
// Hard errors exit non-zero (fail the build / CI). Warnings are printed but do
// not fail — they flag likely-but-not-certain problems (e.g. a content session
// with no speakers, an orphan speaker, a non-https photo).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "..");

// Sessions that legitimately have no speakers (breaks, meals, mixers).
const NETWORKING =
  /networking|break|lunch|breakfast|coffee|reception|party|happy hour|welcome|registration|fingerfood|jazz|\bnight\b|neckarmeile|drinks|dinner|marketplace|farewell|roundtable/i;

export async function validate({ root = DEFAULT_ROOT, checkLinks = false } = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const load = (name) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
    } catch (e) {
      err(`data/${name}: ${e.code === "ENOENT" ? "missing file" : "invalid JSON — " + e.message}`);
      return null;
    }
  };
  const asArray = (v, name) => {
    if (v === null) return [];
    if (!Array.isArray(v)) { err(`data/${name}: expected a JSON array`); return []; }
    return v;
  };

  const speakers = asArray(load("speakers.json"), "speakers.json");
  const orgs = asArray(load("organizations.json"), "organizations.json");
  const sessions = asArray(load("sessions.json"), "sessions.json");
  const research = load("research.json");

  // Event days, parsed from event.config.ts (regex — avoids importing TS here).
  let days = [];
  try {
    const m = fs.readFileSync(path.join(root, "event.config.ts"), "utf8").match(/days:\s*\[([^\]]*)\]/);
    if (m) days = [...m[1].matchAll(/(\d{4}-\d{2}-\d{2})/g)].map((x) => x[1]);
  } catch { /* event.config optional for validation */ }

  // Required fields + unique ids.
  const idSet = (list, name, required) => {
    const seen = new Set();
    list.forEach((item, i) => {
      if (!item || typeof item !== "object") { err(`${name}[${i}]: not an object`); return; }
      for (const f of required)
        if (item[f] === undefined || item[f] === "") err(`${name}[${i}] (${item.id ?? "no id"}): missing required "${f}"`);
      if (item.id != null) {
        if (seen.has(item.id)) err(`${name}: duplicate id "${item.id}"`);
        seen.add(item.id);
      }
    });
    return seen;
  };
  const speakerIds = idSet(speakers, "speakers", ["id", "name"]);
  const orgIds = idSet(orgs, "organizations", ["id", "name", "type"]);
  idSet(sessions, "sessions", ["id", "title", "start", "end"]);

  const ORG_TYPES = new Set(["company", "partner", "sponsor"]);
  for (const o of orgs) if (o?.type && !ORG_TYPES.has(o.type)) err(`organization ${o.id}: invalid type "${o.type}"`);

  // Sessions: referential integrity, dates, speaker-count heuristic.
  const referenced = new Set();
  for (const s of sessions) {
    for (const id of s.speakerIds ?? []) {
      if (!speakerIds.has(id)) err(`session ${s.id}: speakerId "${id}" not found in speakers.json`);
      else referenced.add(id);
    }
    for (const id of s.orgIds ?? []) if (!orgIds.has(id)) err(`session ${s.id}: orgId "${id}" not found in organizations.json`);

    if (s.start && s.end && !(new Date(s.start).getTime() < new Date(s.end).getTime()))
      err(`session ${s.id}: start is not before end (${s.start} / ${s.end})`);
    if (s.start && Number.isNaN(new Date(s.start).getTime())) err(`session ${s.id}: unparseable start "${s.start}"`);
    if (days.length && s.start && !days.includes(s.start.slice(0, 10)))
      warn(`session ${s.id}: date ${s.start.slice(0, 10)} is outside event.config days [${days.join(", ")}]`);

    const isNetworking = (s.tags ?? []).some((t) => /network/i.test(t)) || NETWORKING.test(s.title ?? "");
    if (!isNetworking && (s.speakerIds ?? []).length === 0)
      warn(`session ${s.id}: content session has no speakers — "${(s.title ?? "").slice(0, 60)}"`);
  }

  // Speakers: org integrity, photo sanity, orphans.
  for (const sp of speakers) {
    if (sp.orgId && !orgIds.has(sp.orgId)) err(`speaker ${sp.id}: orgId "${sp.orgId}" not found in organizations.json`);
    if (sp.photo) {
      if (!/^https:\/\//.test(sp.photo)) warn(`speaker ${sp.id}: photo is not an https URL`);
      else if (/platzhalter|placeholder/i.test(sp.photo)) warn(`speaker ${sp.id}: photo looks like a placeholder image`);
    }
    if (!referenced.has(sp.id)) warn(`speaker ${sp.id} (${sp.name}) is not referenced by any session`);
  }

  // Pre-generated dossiers: flag any that still open with a process/meta sentence.
  if (research && typeof research === "object" && !Array.isArray(research)) {
    const { stripLeadingMeta } = await import("../lib/strip-meta.mjs");
    for (const [id, r] of Object.entries(research))
      if (r && typeof r.summary === "string" && stripLeadingMeta(r.summary) !== r.summary.trim())
        warn(`research ${id}: summary opens with a process/meta sentence (run npm run clean:research)`);
  }

  // Opt-in: actually fetch the photo URLs. 404/410 are dead (error); other
  // failures (403/timeout) are environment-dependent, so only warn.
  if (checkLinks) {
    const urls = [...new Set(speakers.map((s) => s.photo).filter(Boolean))];
    process.stdout.write(`checking ${urls.length} photo URLs…\n`);
    await Promise.all(
      urls.map(async (u) => {
        try {
          const r = await fetch(u, { method: "GET", signal: AbortSignal.timeout(10000) });
          if (r.status === 404 || r.status === 410) err(`photo ${u} → HTTP ${r.status} (dead link)`);
          else if (!r.ok) warn(`photo ${u} → HTTP ${r.status}`);
        } catch (e) {
          warn(`photo ${u} → unreachable (${e.message})`);
        }
      })
    );
  }

  return { errors, warnings, counts: { speakers: speakers.length, sessions: sessions.length, organizations: orgs.length } };
}

// Run directly → print and set exit code.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, warnings, counts } = await validate({ checkLinks: process.argv.includes("--check-links") });
  for (const w of warnings) console.log("⚠️ ", w);
  for (const e of errors) console.error("❌ ", e);
  console.log(
    `\n${errors.length} error(s), ${warnings.length} warning(s) — ` +
      `${counts.speakers} speakers, ${counts.sessions} sessions, ${counts.organizations} orgs.`
  );
  process.exit(errors.length ? 1 : 0);
}
