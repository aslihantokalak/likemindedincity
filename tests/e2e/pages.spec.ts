import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { MODULES, moduleHref } from "../../src/lib/modules";

const routes = [...MODULES.map(m => moduleHref(m.slug)), "/decision-log/001-data-portability", "/decision-log/002-sensitive-attributes"];

for (const route of routes) {
  test(`${route} loads with a heading and no serious a11y violations`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => v.id)).toEqual([]);
  });

  test(`${route} has no horizontal scroll at 375px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
}

test("unknown route shows the 404 page", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
