#!/usr/bin/env node
// Apply the canonical meta/preamble stripper to a committed research.json so the
// pre-generated dossiers stay clean — the same cleanup the live /api/research
// route does on the fly. Idempotent; run it after (re)generating dossiers.
//
//   node scripts/clean-research.mjs [path-to-research.json]   (default: data/research.json)

import fs from "node:fs";
import path from "node:path";
import { stripLeadingMeta } from "../lib/strip-meta.mjs";

const file = process.argv[2] || "data/research.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

let changed = 0;
for (const [id, entry] of Object.entries(data)) {
  if (!entry || typeof entry.summary !== "string") continue;
  const cleaned = stripLeadingMeta(entry.summary);
  if (cleaned !== entry.summary) {
    entry.summary = cleaned;
    changed++;
    console.log("cleaned", id);
  }
}

if (changed) fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`${changed} dossier(s) cleaned in ${path.relative(process.cwd(), file)}`);
