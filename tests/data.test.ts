import { describe, it, expect } from "vitest";
import { validate } from "../scripts/validate-data.mjs";

// The committed data/*.json must always pass the integrity checks the build
// enforces — this catches a bad edit/import in CI before it can ship. Warnings
// (orphan speakers, content sessions with no speakers, etc.) are allowed.
describe("data integrity", () => {
  it("committed data/*.json has no hard errors", async () => {
    const { errors } = await validate();
    if (errors.length) console.error("data errors:\n" + errors.join("\n"));
    expect(errors).toEqual([]);
  });
});
