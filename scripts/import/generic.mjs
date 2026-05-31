// LLM-powered importer for any non-standard source → data/*.json
//
//   node scripts/import/generic.mjs <file-or-url> [--tz Europe/Berlin] [--out dir]
//
// For schedule data that isn't ICS or frab — a JSON dump, an HTML page saved to
// a file, a CSV, even pasted text. Claude maps it to the app's data model.
// Requires ANTHROPIC_API_KEY (see .env.example). Review the output before
// trusting it, and only import data you have the right to use.
import { readSource, writeData, summarize, parseArgs } from "./lib.mjs";
import { mapWithClaude } from "./llm.mjs";

const args = parseArgs(process.argv.slice(2));
const src = args._[0];
if (!src) {
  console.error("usage: node scripts/import/generic.mjs <file-or-url> [--tz <IANA tz>] [--out dir]");
  process.exit(1);
}

const text = await readSource(src);
console.error(`mapping ${text.length} chars via Claude (timezone: ${args.tz || "UTC"})…`);
const data = await mapWithClaude(text, { timezone: args.tz });

writeData("sessions", data.sessions, args.out);
writeData("speakers", data.speakers, args.out);
writeData("organizations", data.organizations, args.out);
summarize(data);
