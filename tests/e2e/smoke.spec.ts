import { expect, test } from "@playwright/test";

// Phase 0 smoke test: the app shell renders, and the home page reads from the test database.
test("home page renders the shell and reads watched progress from the database", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Marvel Directory" })).toBeVisible();
  // The progress bar only appears after the database query resolves. The skeleton is shown before that.
  await expect(page.getByRole("progressbar", { name: "Overall watched progress" })).toBeVisible({
    timeout: 20_000,
  });
});

test("the header nav and search are present on every page", async ({ page }) => {
  await page.goto("/");
  const sections = page.getByRole("navigation", { name: "Sections" }).first();
  await expect(sections.getByRole("link", { name: "Recaps" })).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
});

test("pages ask search engines not to index them", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Disallow: /");
});

test("unknown URLs render the designed 404 inside the app shell", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Lost in the multiverse" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Recaps" })).toBeVisible();
});
