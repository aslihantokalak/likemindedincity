import { LIVE_SLOTS, nextOccurrence, slotAt, slotLabel } from "../../src/domain/live/slots";

const now = new Date("2026-10-19T09:00:00+03:00"); // Monday

test("21 slots, Monday morning first", () => {
  expect(LIVE_SLOTS).toHaveLength(21);
  expect(LIVE_SLOTS[0]).toBe("mon_morning");
  expect(LIVE_SLOTS[20]).toBe("sun_evening");
});

test("next Thursday evening is 3 days out", () =>
  expect(nextOccurrence("thu_evening", now).toISOString()).toBe(new Date("2026-10-22T19:30:00+03:00").toISOString()));

test("a slot under 48h away moves a week later", () =>
  expect(nextOccurrence("tue_evening", now).toISOString()).toBe(new Date("2026-10-27T19:30:00+03:00").toISOString()));

test("today's slot already passed moves to next week", () =>
  expect(nextOccurrence("mon_morning", now).toISOString()).toBe(new Date("2026-10-26T10:00:00+03:00").toISOString()));

test("minLeadHours 0 allows later today", () =>
  expect(nextOccurrence("mon_evening", now, 0).toISOString()).toBe(new Date("2026-10-19T19:30:00+03:00").toISOString()));

test("slotLabel", () => expect(slotLabel("sat_morning")).toBe("Saturday morning"));

test("slotAt reads the slot back from a date", () => {
  expect(slotAt(new Date("2026-10-22T19:30:00+03:00"))).toBe("thu_evening");
  expect(slotAt(new Date("2026-10-25T10:00:00+03:00"))).toBe("sun_morning");
  expect(slotAt(new Date("2026-10-24T14:00:00+03:00"))).toBe("sat_afternoon");
});
