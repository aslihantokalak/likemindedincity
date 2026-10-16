import { test, expect, type Page } from "@playwright/test";

async function signUp(page: Page, opts: { name: string; age: string; city: string; district?: string; slots: string[] }) {
  await page.getByLabel("First name").fill(opts.name);
  await page.getByLabel("Age").fill(opts.age);
  await page.getByLabel("City").selectOption(opts.city);
  if (opts.district) await page.getByLabel("District").selectOption(opts.district);
  else await page.getByLabel("District").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Friendship" }).click();
  for (const i of ["Hiking", "Cooking", "Literary fiction", "Photography"]) await page.getByRole("button", { name: i, exact: true }).click();
  for (const s of opts.slots) await page.getByRole("button", { name: s, exact: true }).click();
  await page.getByLabel(/I understand this is a demo/).check();
  await page.getByRole("button", { name: "Set my table" }).click();
}

const EVENINGS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `${d} evening`).concat(["Sat afternoon", "Sun afternoon"]);

test.beforeEach(async ({ page }) => {
  await page.goto("/join");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel("First name")).toBeVisible(); // the app has loaded and seeded the store
});

test("sign up in İstanbul, get a table, RSVP, reload, decline, start over", async ({ page }) => {
  await signUp(page, { name: "Aslı", age: "30", city: "İstanbul", district: "Kadıköy", slots: EVENINGS });
  await expect(page.getByText("Your table is set")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/NaN|undefined/);

  await page.getByRole("button", { name: "I'm coming" }).click();
  await expect(page.getByRole("button", { name: "You're coming" })).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("button", { name: "You're coming" })).toBeVisible();

  await page.getByRole("button", { name: "Not this time" }).click();
  await expect(page.getByText("We'll find you another table soon.")).toBeVisible();

  await page.getByRole("button", { name: "Start over as someone new" }).click();
  await expect(page.getByLabel("First name")).toBeVisible();
});

test("alone in a city with no members means the waitlist", async ({ page }) => {
  await signUp(page, { name: "Gül", age: "40", city: "Hakkari", slots: ["Sat morning"] });
  await expect(page.getByText("We need 3 more people in Hakkari")).toBeVisible();
});

test("empty submit focuses the first field and explains why", async ({ page }) => {
  await page.getByRole("button", { name: "Set my table" }).click();
  await expect(page.getByLabel("First name")).toBeFocused();
  await expect(page.getByText("Tell us your first name.")).toBeVisible();
});

test("after a past meetup the member can rate it", async ({ page }) => {
  await page.evaluate(() => {
    const events = JSON.parse(localStorage.getItem("likeminded:v1:events")!);
    const feedback = JSON.parse(localStorage.getItem("likeminded:v1:feedback")!);
    const past = events.find((e: { status: string }) => e.status === "past");
    const me = past.memberIds[0];
    const upcomingIds = new Set(events.filter((e: { status: string }) => e.status === "upcoming").flatMap((e: { memberIds: string[] }) => e.memberIds));
    if (upcomingIds.has(me)) for (const e of events) e.memberIds = e.memberIds.filter((id: string) => e.status !== "upcoming" || id !== me);
    for (const e of events) if (e.status === "past" && e.memberIds.includes(me) && e.id !== past.id) e.memberIds = e.memberIds.filter((id: string) => id !== me);
    const members = JSON.parse(localStorage.getItem("likeminded:v1:members")!);
    const mate = members.find((m: { id: string }) => m.id === past.memberIds[1]);
    mate.idea = "Cities should have more benches";
    localStorage.setItem("likeminded:v1:members", JSON.stringify(members));
    localStorage.setItem("likeminded:v1:events", JSON.stringify(events));
    localStorage.setItem("likeminded:v1:feedback", JSON.stringify(feedback.filter((f: { memberId: string }) => f.memberId !== me)));
    localStorage.setItem("likeminded:v1:currentMember", JSON.stringify(me));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "How was it?" })).toBeVisible();
  await expect(page.getByText("Cities should have more benches")).toBeVisible();
  await page.getByRole("radio", { name: "5 out of 5" }).locator("..").click();
  await expect(page.getByRole("radio", { name: "5 out of 5" })).toBeChecked();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/Glad you came/)).toBeVisible();
});
