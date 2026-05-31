// Optional Claude assistance for the importers. Used for the bits that need
// reasoning rather than parsing: inferring topic tags, and mapping arbitrary
// (non-standard) schedule sources to the app's data model.
//
// Requires ANTHROPIC_API_KEY (read from the environment or .env.local). Reuses
// the @anthropic-ai/sdk dependency the app already ships with.
import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "./lib.mjs";

const MODEL = process.env.RESEARCH_MODEL || "claude-opus-4-8";

function client() {
  loadEnv();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "This step needs ANTHROPIC_API_KEY. Set it in .env.local or the environment (see .env.example)."
    );
  }
  return new Anthropic();
}

/** Force a single structured tool call and return its validated input. */
async function structured({ system, user, toolName, schema, maxTokens = 8000 }) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    tools: [{ name: toolName, description: "Return the structured result.", input_schema: schema }],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block) throw new Error("Model did not return structured output.");
  return block.input;
}

/**
 * Fill in topic tags for sessions that don't have any, inferring 1–3 concise
 * tags from the title + description. Mutates `sessions` in place.
 */
export async function enrichTags(sessions) {
  const missing = sessions.filter((s) => !s.tags || s.tags.length === 0);
  if (missing.length === 0) return sessions;
  console.error(`  enriching tags for ${missing.length} sessions via Claude…`);
  const items = missing.map((s) => ({
    id: s.id,
    title: s.title,
    description: (s.description || "").slice(0, 400),
  }));
  const out = await structured({
    system:
      "You assign topic tags to conference sessions. Give each 1–3 concise, " +
      "Title Case tags (e.g. \"AI\", \"Security\", \"Design\", \"Policy\"). Reuse the " +
      "same tag wording across sessions so they group well. No sentences.",
    user: "Tag these sessions:\n" + JSON.stringify(items, null, 2),
    toolName: "assign_tags",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, tags: { type: "array", items: { type: "string" } } },
            required: ["id", "tags"],
          },
        },
      },
      required: ["items"],
    },
    maxTokens: 4000,
  });
  const byId = new Map((out.items || []).map((i) => [i.id, i.tags]));
  for (const s of missing) {
    const tags = (byId.get(s.id) || []).filter(Boolean);
    if (tags.length) {
      s.tags = tags;
      s.track = tags[0];
    }
  }
  return sessions;
}

const SESSION_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    start: { type: "string", description: "ISO 8601 with timezone offset" },
    end: { type: "string", description: "ISO 8601 with timezone offset" },
    stage: { type: "string" },
    track: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    speakerIds: { type: "array", items: { type: "string" } },
    orgIds: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    sourceUrl: { type: "string" },
  },
  required: ["id", "title", "start", "end"],
};

/**
 * Map an arbitrary schedule source (JSON, HTML text, CSV, free text) to the
 * app's data model. For sources that aren't a standard ICS/frab feed.
 */
export async function mapWithClaude(sourceText, { timezone } = {}) {
  const tz = timezone || "UTC";
  const out = await structured({
    system:
      "You convert event schedule data into a fixed JSON data model for a " +
      "conference companion app. Rules:\n" +
      "- Generate stable kebab-case ids: sessions 'ses-…', speakers 'spk-…', orgs 'org-…'.\n" +
      "- Link sessions to people/orgs via speakerIds/orgIds matching those ids.\n" +
      `- Times MUST be ISO 8601 with a timezone offset. If the source lacks one, assume ${tz}.\n` +
      "- Infer 1–3 concise Title Case topic tags per session; set track to the first.\n" +
      "- Only include data present in the source. Never invent people, times, or facts.",
    user: "Convert this schedule source:\n\n" + sourceText.slice(0, 150000),
    toolName: "emit_data",
    schema: {
      type: "object",
      properties: {
        sessions: { type: "array", items: SESSION_SCHEMA },
        speakers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" }, name: { type: "string" }, title: { type: "string" },
              company: { type: "string" }, orgId: { type: "string" },
              topics: { type: "array", items: { type: "string" } }, bio: { type: "string" },
            },
            required: ["id", "name"],
          },
        },
        organizations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" }, name: { type: "string" },
              type: { type: "string", enum: ["company", "partner", "sponsor"] },
              tagline: { type: "string" }, website: { type: "string" }, booth: { type: "string" },
              topics: { type: "array", items: { type: "string" } },
            },
            required: ["id", "name", "type"],
          },
        },
      },
      required: ["sessions", "speakers", "organizations"],
    },
    maxTokens: 16000,
  });
  return {
    sessions: out.sessions || [],
    speakers: out.speakers || [],
    organizations: out.organizations || [],
  };
}
