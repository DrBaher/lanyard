import { test, expect, type Page } from "@playwright/test";

const ROUTES = ["/", "/search", "/agenda", "/speakers", "/companies", "/meet", "/me"];

// Bypass the group-code gate on every page (the gate itself is unit-tested).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("te.auth", "1");
    } catch {}
  });
});

/** Collect console.error / pageerror for the lifetime of a test. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

test("every route renders past the gate with no console errors", async ({ page }) => {
  const errors = trackErrors(page);
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("text=Group access code")).toHaveCount(0);
  }
  // Ignore the dev-only favicon race etc.; there should be none in prod.
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test("starring a session drives the My Schedule filter and calendar export", async ({ page }) => {
  await page.goto("/agenda");
  await page.getByRole("button", { name: "Add to my schedule" }).first().click();
  // The export button appears once something is starred.
  const exportBtn = page.getByRole("button", { name: /Add my schedule to calendar/i });
  await expect(exportBtn).toBeVisible();

  // My Schedule filter keeps only starred items.
  await page.locator("button.chip", { hasText: "My schedule" }).click();
  await expect(page.locator("text=No sessions match")).toHaveCount(0);

  // Calendar export produces a .ics download.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportBtn.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
});

test("a single session exports to .ics", async ({ page }) => {
  await page.goto("/agenda");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Add to calendar" }).first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
});

test("add a contact manually and see it in the list", async ({ page }) => {
  await page.goto("/meet");
  await expect(page.locator("text=No contacts yet")).toBeVisible();
  await page.getByRole("button", { name: /Add manually/i }).click();
  await page.getByLabel("Name").fill("Dr. Jane Test");
  await page.getByLabel("Company").fill("Acme AI");
  await page.getByRole("button", { name: "Hot lead" }).click();
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(page.locator("text=Dr. Jane Test")).toBeVisible();
  await expect(page.locator("text=1 contacts")).toBeVisible();
});

test("my card renders a QR after saving", async ({ page }) => {
  await page.goto("/me");
  await page.getByLabel("Full name").fill("Dr. Baher");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator("canvas")).toBeVisible();
});

test("global search finds sessions across the program", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("Search the whole event…").fill("Europe");
  await expect(page.getByRole("heading", { name: /Sessions ·/ })).toBeVisible();
});
