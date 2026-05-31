import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Mirror the "@/*" path alias from tsconfig so lib code resolves in tests.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Focus on the pure logic we actually unit-test; UI/providers are
      // exercised by the Playwright E2E layer instead.
      include: ["lib/**/*.ts"],
      exclude: ["lib/data.ts", "lib/supabase.ts", "lib/storage.ts"],
    },
  },
});
