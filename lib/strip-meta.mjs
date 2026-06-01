// Canonical meta/preamble stripper for research dossiers. Shared by the live
// research route (app/api/research/route.ts) and the offline data cleaner
// (scripts/clean-research.mjs) so the runtime and the pre-generated
// data/research.json stay in sync.
//
// The web-search model occasionally opens a dossier with a process/meta
// sentence aimed at the reader ("I have enough verified information to compile
// the dossier.", "Based on my research, …", "Here is the brief …"). The dossier
// itself should start with the subject, so a leading first-person/meta sentence
// is noise — strip up to two of them.

// Precise about first person: only process/confidence openers ("I have enough…",
// "I'll compile…"), never a legitimate "I couldn't find reliable info…" message.
const META_OPENER =
  /^(?:i(?:['’]ll\b|['’]ve\b| have\b| now\b| will\b| can now\b| was able to\b)|here['’]?s\b|here is\b|based on (?:my|the)\b|after (?:reviewing|searching|conducting|gathering)\b|let me\b|drawing on\b|having (?:reviewed|searched|gathered)\b|to (?:summari[sz]e|compile)\b)/i;

/**
 * Remove up to two leading process/meta sentences from a dossier so it opens
 * with the subject. Idempotent and safe — never empties the text.
 * @param {string} text
 * @returns {string}
 */
export function stripLeadingMeta(text) {
  let out = text.trim();
  for (let i = 0; i < 2; i++) {
    if (!META_OPENER.test(out)) break;
    const m = out.match(/^.*?[.!?](?:\s+|$)/s); // first sentence
    if (!m) break;
    const rest = out.slice(m[0].length).trim();
    if (!rest) break; // never strip away everything
    out = rest;
  }
  return out;
}
