import { describe, it, expect, beforeEach, vi } from "vitest";

// Minimal browser shims so lib/research's localStorage cache works under node.
const store = new Map<string, string>();
const localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
// @ts-expect-error test shim
globalThis.window = { localStorage };
// @ts-expect-error test shim
globalThis.localStorage = localStorage;

const { research } = await import("../lib/research");
const { stripLeadingMeta } = await import("../app/api/research/route");
const cache = await import("../lib/research-cache");

function mockFetch(payload: unknown, ok = true) {
  const fn = vi.fn(async () => ({ ok, json: async () => payload }));
  // @ts-expect-error test shim
  globalThis.fetch = fn;
  return fn;
}

describe("research caching", () => {
  beforeEach(() => store.clear());

  it("calls the API once, then serves the cached result", async () => {
    const fetchFn = mockFetch({ stub: false, summary: "Cohere is…", bullets: ["a"] });
    const first = await research("organization", { name: "Cohere" });
    expect(first.cached).toBeFalsy();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const second = await research("organization", { name: "Cohere" });
    expect(second.cached).toBe(true);
    expect(second.summary).toBe("Cohere is…");
    expect(fetchFn).toHaveBeenCalledTimes(1); // no second network call
  });

  it("does not cache stub responses", async () => {
    const fetchFn = mockFetch({ stub: true, summary: "preview" });
    await research("speaker", { name: "Nobody" });
    await research("speaker", { name: "Nobody" });
    expect(fetchFn).toHaveBeenCalledTimes(2); // re-fetched, never cached
  });

  it("falls back to cache when the network fails", async () => {
    mockFetch({ stub: false, summary: "saved" });
    await research("contact", { name: "Jane" }); // populate cache
    // now simulate offline
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const offline = await research("contact", { name: "Jane" });
    expect(offline.cached).toBe(true);
    expect(offline.summary).toBe("saved");
  });
});

describe("stripLeadingMeta", () => {
  it("drops a leading 'I have enough…' process sentence", () => {
    const input =
      "I have enough verified information to compile the dossier. Jakob Uszkoreit is the CEO and co-founder of Inceptive.";
    expect(stripLeadingMeta(input)).toBe(
      "Jakob Uszkoreit is the CEO and co-founder of Inceptive."
    );
  });

  it("drops other meta openers (Based on…, Here's…, Let me…)", () => {
    expect(stripLeadingMeta("Based on my research, here is the brief. Acme builds chips.")).toBe(
      "Acme builds chips."
    );
    expect(stripLeadingMeta("Here's the dossier. She leads engineering at Foo.")).toBe(
      "She leads engineering at Foo."
    );
    expect(stripLeadingMeta("Let me summarize. He founded Bar in 2019.")).toBe(
      "He founded Bar in 2019."
    );
  });

  it("leaves a normal dossier untouched", () => {
    const ok = "Jakob Uszkoreit is the CEO of Inceptive. He co-authored a key AI paper.";
    expect(stripLeadingMeta(ok)).toBe(ok);
    // starts with 'I' but is a real word, not a meta opener
    const inceptive = "Inceptive applies generative AI to RNA biology.";
    expect(stripLeadingMeta(inceptive)).toBe(inceptive);
  });

  it("preserves a legitimate 'I couldn't find…' message", () => {
    const noInfo = "I couldn't find reliable information about this person.";
    expect(stripLeadingMeta(noInfo)).toBe(noInfo);
  });

  it("strips at most two meta sentences and never empties the text", () => {
    expect(stripLeadingMeta("I have the results. Here's the brief. Real content here.")).toBe(
      "Real content here."
    );
    // meta-only: nothing left to keep → returned as-is
    const metaOnly = "I have enough information to proceed.";
    expect(stripLeadingMeta(metaOnly)).toBe(metaOnly);
  });
});

describe("research-cache", () => {
  it("builds a versioned, lowercased, kind-scoped key", () => {
    expect(cache.keyFor("speaker", "Jakob Uszkoreit")).toBe(
      "research:v1:speaker|jakob uszkoreit|"
    );
    expect(cache.keyFor("organization", "Inceptive", "RNA")).toBe(
      "research:v1:organization|inceptive|rna"
    );
  });

  it("no-ops without KV env: not configured, get returns null, no network call", async () => {
    const noFetch = vi.fn(() => {
      throw new Error("network must not be touched when KV is unconfigured");
    });
    globalThis.fetch = noFetch as unknown as typeof fetch;
    expect(cache.cacheConfigured()).toBe(false);
    await expect(cache.getCached("speaker", "Jakob Uszkoreit")).resolves.toBeNull();
    await expect(
      cache.setCached("speaker", "Jakob", undefined, { summary: "x", bullets: [] })
    ).resolves.toBeUndefined();
    expect(noFetch).not.toHaveBeenCalled();
  });
});
