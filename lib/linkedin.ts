// Helpers for turning a scanned badge payload into something actionable.
//
// Reality: event badges vary wildly. Some encode a vCard, some a URL, some a
// plain attendee id. There is also no public LinkedIn API to "open a profile"
// from a name. So we (1) best-effort parse the payload, and (2) build a
// LinkedIn *search* deep link prefilled with the name/company, which is the
// fastest reliable way to reach the person and hit "Connect".

export interface ParsedBadge {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  linkedin?: string;
  raw: string;
}

export function parseBadge(payload: string): ParsedBadge {
  const raw = payload.trim();
  const out: ParsedBadge = { raw };

  // Direct LinkedIn URL in the payload.
  const li = raw.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s"']+/i);
  if (li) out.linkedin = li[0];

  // vCard (BEGIN:VCARD ... END:VCARD)
  if (/BEGIN:VCARD/i.test(raw)) {
    const fn = raw.match(/\bFN:(.+)/i);
    const org = raw.match(/\bORG:(.+)/i);
    const title = raw.match(/\bTITLE:(.+)/i);
    const email = raw.match(/\bEMAIL[^:]*:(.+)/i);
    if (fn) out.name = fn[1].trim();
    if (org) out.company = org[1].split(";")[0].trim();
    if (title) out.role = title[1].trim();
    if (email) out.email = email[1].trim();
    return out;
  }

  // Generic key:value lines (name:, company:, etc.)
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*(name|company|org|organisation|organization|title|role|email)\s*[:=]\s*(.+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "name") out.name = val;
    else if (key === "email") out.email = val;
    else if (key === "title" || key === "role") out.role = val;
    else out.company = val;
  }

  // Fallback: if it's just a plain string and nothing matched, treat as name.
  if (!out.name && !out.linkedin && !/^https?:/i.test(raw) && raw.length < 80) {
    out.name = raw;
  }
  return out;
}

export function linkedinSearchUrl(name?: string, company?: string): string {
  const q = [name, company].filter(Boolean).join(" ").trim();
  // A LinkedIn *universal link*. On a phone with the LinkedIn app installed,
  // the OS hands this off to the app (landing on the people-search for the
  // person, ready to Connect); otherwise it opens linkedin.com in the browser.
  // We use this rather than the undocumented `linkedin://` scheme because the
  // scheme has no stable people-search entry point.
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`;
}

// --- OCR badge parsing ---
// A printed conference badge typically shows: a big NAME, a role line, and a
// company. OCR returns those as messy lines, so we apply light heuristics to
// guess the fields, then let the user confirm/edit before saving.

export interface OcrGuess {
  name?: string;
  company?: string;
  role?: string;
  raw: string;
}

const ORG_HINT =
  // NB: no bare "co" — it false-matches "Co-founder". Use "corp"/"company" etc.
  /\b(inc|llc|ltd|gmbh|ag|corp|company|group|holdings?|labs?|technologies|technology|software|solutions|systems|ventures|capital|university|institute|foundation|government|ministry|agency|association|bank|consulting|media|digital|cloud)\b/i;
const ROLE_HINT =
  /\b(ceo|cto|cfo|coo|cmo|founder|co-?founder|director|head|manager|lead|engineer|developer|designer|partner|president|vp|vice president|chief|officer|consultant|analyst|scientist|researcher|advisor|architect|minister|secretary|owner|principal|chair(man|woman)?)\b/i;
// Lines that are almost certainly not a person's name/company.
const NOISE =
  /(badge|attendee|visitor|delegate|speaker|press|staff|exhibitor|hall|booth|stand|www\.|https?:|@|conference|summit|expo|20\d\d)/i;
const NAME_WORD = /^[A-ZÀ-Ý][\p{L}.'’-]+$/u;

export function parseBadgeText(text: string): OcrGuess {
  const raw = text;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1);
  const clean = lines.filter((l) => !NOISE.test(l));

  let name: string | undefined;
  // Name = first clean, digit-free line of 2–4 capitalised words.
  for (const l of clean) {
    if (/\d/.test(l)) continue;
    const words = l.split(" ");
    if (words.length >= 2 && words.length <= 4 && words.every((w) => NAME_WORD.test(w))) {
      name = l;
      break;
    }
  }

  // Role = the first non-name line mentioning a title keyword.
  const role = clean.find((l) => l !== name && ROLE_HINT.test(l));

  // Company: prefer a line with an org keyword that isn't the role; otherwise
  // the first remaining line that is neither the name nor the role and has no
  // digits (handles Name -> Role -> Company order, e.g. "Deutsche Telekom").
  let company = clean.find(
    (l) => l !== name && l !== role && !ROLE_HINT.test(l) && ORG_HINT.test(l)
  );
  if (!company) {
    company = clean.find(
      (l) => l !== name && l !== role && !/\d/.test(l) && !ROLE_HINT.test(l)
    );
  }

  return { name, company, role, raw };
}
