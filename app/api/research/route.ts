import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// --- LLM research endpoint (server-side) ---
//
// Calls Claude with the web_search server tool to produce a short, factual
// brief on a speaker, organization, or person you just met. The API key lives
// only here (process.env.ANTHROPIC_API_KEY) and is never sent to the browser.
//
// If no key is configured, we return a labelled STUB so the UI stays fully
// clickable in dev/demo. Set ANTHROPIC_API_KEY (and optionally RESEARCH_MODEL)
// in the server environment to go live.

export const runtime = "nodejs";
// Allow up to ~60s — web search + reasoning can take a while.
export const maxDuration = 60;

interface Body {
  kind: "speaker" | "organization" | "contact";
  name: string;
  context?: string;
}

const MODEL = process.env.RESEARCH_MODEL || "claude-opus-4-8";

// --- Abuse guards for this paid endpoint ---
// The app key is the shared group code (also used by the client). It's not a
// secret against a determined attacker who reads the bundle, but it stops
// drive-by hits and crawlers. The rate limiter is best-effort and in-memory
// (per serverless instance) — for hard guarantees, back it with a KV store.
const APP_KEY = process.env.NEXT_PUBLIC_GROUP_CODE || "";
const RATE_MAX = 12; // requests
const RATE_WINDOW_MS = 5 * 60_000; // per 5 minutes per IP
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory cap
  return recent.length > RATE_MAX;
}

// Stable system prompt → kept byte-identical across requests so the prefix can
// be cached. The volatile bits (name, context) go in the user message.
const SYSTEM_PROMPT = `You are a research assistant inside an event-networking app. The user is \
attending a technology conference and taps "Research" on a speaker, company, or \
person they just met. Produce a brief, factual dossier to help them have a \
better conversation.

Use the web_search tool to find current, verifiable information. Prioritise: \
current role and organization; what they/it are known for; notable recent work, \
funding, launches, or news; and one or two specific, non-obvious talking points.

Rules:
- Be concise and skimmable. No preamble, no flattery, no filler.
- State only what you can support from search results. If you are unsure a \
result refers to the same person/company, say so rather than guessing — \
name collisions are common.
- If you find little or nothing reliable, say that plainly instead of padding.
- Never invent contact details, quotes, or statistics.

Output format (plain text, exactly this shape):
- First, a 1-2 sentence summary paragraph.
- Then a blank line.
- Then 3-5 bullet points, each starting with "- ".
Do not use markdown headings, bold, or any other formatting.`;

function buildPrompt(body: Body): string {
  const subject =
    body.kind === "organization" ? "a company/organization" : "a person";
  const lines = [
    `Research ${subject} I encountered at the event.`,
    `Name: ${body.name}`,
  ];
  if (body.context) lines.push(`Context: ${body.context}`);
  if (body.kind === "contact") {
    lines.push(
      "This is someone I just met and want to follow up with — focus on who they are professionally and a useful way to connect."
    );
  }
  return lines.join("\n");
}

/** Parse the model's plain-text output into a summary + bullets. */
function parseOutput(text: string): { summary: string; bullets: string[] } {
  const trimmed = text.trim();
  const bullets: string[] = [];
  const summaryLines: string[] = [];
  let inBullets = false;
  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^[-*•]\s+(.*)$/);
    if (m) {
      bullets.push(m[1].trim());
      inBullets = true;
    } else if (inBullets) {
      bullets[bullets.length - 1] += " " + line; // continuation of a multi-line bullet
    } else summaryLines.push(line);
  }
  const summary = summaryLines.join(" ").trim() || trimmed;
  return { summary, bullets: bullets.filter(Boolean) };
}

/**
 * Extract the final dossier from a server-tool response. With the web_search
 * tool, the model emits "thinking out loud" text blocks between searches
 * ("Let me retry with sequential searches…"), interleaved with server_tool_use
 * and web_search_tool_result blocks. The real answer is the last run of text
 * blocks — after the final tool block — so we reset on any non-text block and
 * keep only what follows the last one.
 */
function finalText(content: Anthropic.ContentBlock[]): string {
  let buf: string[] = [];
  for (const block of content) {
    if (block.type === "text") buf.push(block.text);
    else buf = [];
  }
  return buf.join("\n").trim();
}

function stub(kind: string, name: string, context?: string) {
  return NextResponse.json({
    stub: true,
    summary:
      `Research preview for "${name}". This is a placeholder — set ` +
      `ANTHROPIC_API_KEY on the server to generate a real ${kind} summary.`,
    bullets: [
      context ? `Context: ${context}` : `Subject type: ${kind}`,
      "Live research uses Claude with web search, server-side.",
      "Results appear here with the key the conversation needs.",
    ],
  });
}

export async function POST(req: Request) {
  // Gate the paid endpoint: require the shared app key (when configured).
  if (APP_KEY && req.headers.get("x-app-key") !== APP_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { kind, name, context } = body;
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return stub(kind, name, context);

  const client = new Anthropic();

  try {
    // Server-side tools run their own loop; if it pauses (pause_turn) we
    // re-send to let it resume. Bound the continuations to stay snappy.
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildPrompt(body) },
    ];
    let response: Anthropic.Message | null = null;

    for (let i = 0; i < 4; i++) {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        // Cache the stable instructions; the per-request subject is in messages.
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [{ type: "web_search_20260209", name: "web_search" }],
        messages,
      });

      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content });
    }

    const text = finalText(response?.content ?? []);

    if (!text) {
      return NextResponse.json({
        stub: false,
        summary: `No reliable information found for "${name}".`,
        bullets: [],
      });
    }

    const { summary, bullets } = parseOutput(text);
    return NextResponse.json({ stub: false, summary, bullets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
