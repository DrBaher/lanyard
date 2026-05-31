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
