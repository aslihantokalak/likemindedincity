import { test, expect } from "@playwright/test";

test("weights regroup users and Reset restores defaults", async ({ page }) => {
  await page.goto("/technical-design");
  const firstCard = page.getByTestId("group-card").first();
  const original = (await firstCard.textContent()) ?? "";
  expect(original).toContain("Group 1");

  await page.getByLabel("Books").fill("1");
  await page.getByLabel("Interests").fill("0");
  await expect(firstCard).not.toHaveText(original);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(firstCard).toHaveText(original);
});

test("all weights at zero still render without NaN", async ({ page }) => {
  await page.goto("/technical-design");
  for (const label of ["Interests", "Books", "Profession", "Schools", "Diversity"]) await page.getByLabel(label).fill("0");
  await expect(page.getByTestId("group-card").first().or(page.getByTestId("empty-state"))).toBeVisible();
  await expect(page.locator("body")).not.toContainText("NaN");
});
