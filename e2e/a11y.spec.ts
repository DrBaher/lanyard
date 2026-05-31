import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = ["/", "/search", "/agenda", "/speakers", "/companies", "/meet", "/me"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("te.auth", "1");
    } catch {}
  });
});

for (const route of ROUTES) {
  test(`a11y: ${route} has no serious/critical axe violations`, async ({ page }) => {
    await page.goto(route);
    await page.locator("h1").first().waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    if (serious.length) {
      console.log(
        `${route} violations:`,
        serious.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`).join(", ")
      );
    }
    expect(serious).toEqual([]);
  });
}
