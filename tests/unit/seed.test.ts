import { SEED } from "../../src/data/seed";
import { generateSeed, SEED_REFERENCE } from "../../scripts/generate-seed";
import { SEEDED_CITIES } from "../../src/domain/live/venues";
import { toMatchUser } from "../../src/domain/live/member";
import { slotAt } from "../../src/domain/live/slots";
import { checkPair } from "../../src/domain/matching";
import type { Member } from "../../src/domain/types";

const DAY = 1440;
const ref = new Date(SEED_REFERENCE);
const at = (offsetMin: number) => new Date(ref.getTime() + offsetMin * 60_000);
const asMember = (m: (typeof SEED.members)[number]): Member => ({ ...m, createdAt: "" });
const byId = new Map(SEED.members.map(m => [m.id, m]));
const past = SEED.events.filter(e => e.status === "past");
const upcoming = SEED.events.filter(e => e.status === "upcoming");

test("300 members with unique ids", () => {
  expect(SEED.members).toHaveLength(300);
  expect(new Set(SEED.members.map(m => m.id)).size).toBe(300);
});

test("80% live in the three seeded cities", () =>
  expect(SEED.members.filter(m => SEEDED_CITIES.includes(m.province))).toHaveLength(240));

test("a province with fewer than 4 members exists (waitlist demo)", () => {
  const counts = new Map<string, number>();
  SEED.members.forEach(m => counts.set(m.province, (counts.get(m.province) ?? 0) + 1));
  expect([...counts.values()].some(c => c < 4)).toBe(true);
});

test("busiest 2-hour sign-up window starts at 21:00", () => {
  const hours = Array(24).fill(0);
  SEED.members.forEach(m => hours[Math.floor(m.createdMinuteOfDay / 60)]++);
  const windows = hours.map((h, i) => h + hours[(i + 1) % 24]);
  expect(windows.indexOf(Math.max(...windows))).toBe(21);
});

test("second-meetup rate is between 28% and 34%", () => {
  const came = new Map<string, number>();
  past.forEach(e => Object.entries(e.attendance).forEach(([id, s]) => { if (s === "came") came.set(id, (came.get(id) ?? 0) + 1); }));
  const once = [...came.values()].filter(c => c >= 1).length;
  const twice = [...came.values()].filter(c => c >= 2).length;
  expect(twice / once).toBeGreaterThanOrEqual(0.28);
  expect(twice / once).toBeLessThanOrEqual(0.34);
});

test("each seeded city has ≥ 3 upcoming events with open seats and ≥ 10% unplaced members", () => {
  const seated = new Set(upcoming.flatMap(e => e.memberIds));
  for (const city of SEEDED_CITIES) {
    expect(upcoming.filter(e => e.province === city && e.memberIds.length < e.capacity).length).toBeGreaterThanOrEqual(3);
    const people = SEED.members.filter(m => m.province === city);
    expect(people.filter(m => !seated.has(m.id)).length / people.length).toBeGreaterThanOrEqual(0.1);
  }
});

test("every event is one province, everyone can sit together and is free at that time", () => {
  SEED.events.forEach(e => {
    const ms = e.memberIds.map(id => byId.get(id)!);
    expect(e.memberIds.length).toBeGreaterThanOrEqual(3);
    ms.forEach(m => expect(m.province).toBe(e.province));
    const users = ms.map(m => toMatchUser(asMember(m)));
    for (const a of users) for (const b of users) if (a !== b) expect(checkPair(a, b, "province").ok).toBe(true);
    ms.forEach(m => expect(m.availability).toContain(slotAt(at(e.startsOffsetMin))));
  });
});

test("past events are at least 7 days before the reference; upcoming ones after it", () => {
  past.forEach(e => expect(e.startsOffsetMin).toBeLessThanOrEqual(-7 * DAY));
  upcoming.forEach(e => expect(e.startsOffsetMin).toBeGreaterThan(0));
});

test("members joined before every past event they were at", () =>
  past.forEach(e => e.memberIds.forEach(id =>
    expect(byId.get(id)!.createdDaysAgo).toBeGreaterThanOrEqual(Math.ceil(-e.startsOffsetMin / DAY) + 1))));

test("upcoming events have no attendance yet; past events have attendance for everyone", () => {
  upcoming.forEach(e => expect(e.attendance).toEqual({}));
  past.forEach(e => expect(Object.keys(e.attendance).sort()).toEqual([...e.memberIds].sort()));
});

test("feedback only from members who came, picking tablemates", () =>
  SEED.feedback.forEach(f => {
    const e = SEED.events.find(x => x.id === f.eventId)!;
    expect(e.attendance[f.memberId]).toBe("came");
    f.meetAgain.forEach(id => { expect(e.memberIds).toContain(id); expect(id).not.toBe(f.memberId); });
  }));

test("no member was created today or in the future", () =>
  SEED.members.forEach(m => expect(m.createdDaysAgo).toBeGreaterThanOrEqual(1)));

test("deterministic: regenerating equals the committed seed", () => expect(generateSeed(2026)).toEqual(SEED));
