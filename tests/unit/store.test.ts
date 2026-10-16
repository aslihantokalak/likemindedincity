import { LocalStore } from "../../src/store/local-store";
import { materializeSeed } from "../../src/store/store";
import { SEED } from "../../src/data/seed";
import { istanbulParts, slotAt } from "../../src/domain/live/slots";
import type { NewMember } from "../../src/domain/types";

class FakeStorage implements Storage {
  map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, v); }
}

class ThrowingStorage extends FakeStorage {
  override setItem(): void { throw new Error("QuotaExceededError"); }
}

const now = () => new Date("2026-11-05T15:20:00+03:00"); // a Thursday, 2.5 weeks after the seed reference
let n = 0;
const newId = () => `id-${++n}`;
const elif: NewMember = {
  firstName: "Elif", age: 29, province: "İstanbul", district: "Kadıköy", intent: "friendship",
  interests: ["hiking", "jazz", "chess"], availability: ["thu_evening"], languages: ["Turkish"], tableSize: "medium",
};

test("materializeSeed keeps weekdays and times, keeps past in the past and upcoming in the future", () => {
  const data = materializeSeed(SEED, now());
  const byId = new Map(SEED.events.map(e => [e.id, e]));
  const ref = new Date("2026-10-19T00:00:00+03:00");
  data.events.forEach(e => {
    const original = new Date(ref.getTime() + byId.get(e.id)!.startsOffsetMin * 60_000);
    expect(slotAt(new Date(e.startsAt))).toBe(slotAt(original));
    if (e.status === "past") expect(new Date(e.startsAt) < now()).toBe(true);
    else expect(new Date(e.startsAt) > now()).toBe(true);
  });
});

test("materializeSeed: members joined on earlier days at their minute of day", () => {
  const data = materializeSeed(SEED, now());
  const s = SEED.members[0]!;
  const created = istanbulParts(new Date(data.members[0]!.createdAt));
  const today = istanbulParts(now());
  expect(new Date(data.members[0]!.createdAt) < now()).toBe(true);
  expect(created.hour * 60 + created.minute).toBe(s.createdMinuteOfDay);
  const dayNumber = (p: { year: number; month: number; day: number }) => Date.UTC(p.year, p.month, p.day) / 86_400_000;
  expect(dayNumber(today) - dayNumber(created)).toBe(s.createdDaysAgo);
});

test("first load materializes the seed", () => {
  const store = new LocalStore({ storage: new FakeStorage(), now, newId });
  expect(store.listMembers()).toHaveLength(300);
  expect(store.listEvents()).toHaveLength(SEED.events.length);
  expect(store.listFeedback()).toHaveLength(SEED.feedback.length);
});

test("addMember assigns id and createdAt and persists across instances", () => {
  const storage = new FakeStorage();
  const a = new LocalStore({ storage, now, newId });
  const m = a.addMember(elif);
  expect(m).toMatchObject({ ...elif, createdAt: now().toISOString() });
  expect(new LocalStore({ storage, now, newId }).listMembers().find(x => x.id === m.id)).toEqual(m);
});

test("saveEvents upserts by id and setRsvp records an answer", () => {
  const storage = new FakeStorage();
  const store = new LocalStore({ storage, now, newId });
  const e = store.listEvents().find(x => x.status === "upcoming")!;
  store.saveEvents([{ ...e, cohesion: 0.99 }]);
  store.setRsvp(e.id, e.memberIds[0]!, "coming");
  const again = new LocalStore({ storage, now, newId }).listEvents().find(x => x.id === e.id)!;
  expect(again.cohesion).toBe(0.99);
  expect(again.rsvps[e.memberIds[0]!]).toBe("coming");
  expect(store.listEvents()).toHaveLength(SEED.events.length);
});

test("saveFeedback replaces an earlier answer for the same event and member", () => {
  const store = new LocalStore({ storage: new FakeStorage(), now, newId });
  store.saveFeedback({ eventId: "x", memberId: "y", rating: 2, meetAgain: [] });
  store.saveFeedback({ eventId: "x", memberId: "y", rating: 5, meetAgain: ["z"] });
  expect(store.listFeedback().filter(f => f.eventId === "x")).toEqual([{ eventId: "x", memberId: "y", rating: 5, meetAgain: ["z"] }]);
});

test("corrupt JSON falls back to the seed and warns", () => {
  const storage = new FakeStorage();
  new LocalStore({ storage, now, newId }).addMember(elif);
  storage.setItem("likeminded:v1:members", "{not json");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(new LocalStore({ storage, now, newId }).listMembers()).toHaveLength(300);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

test.each([
  ["an object instead of a list", "{}"],
  ["a number", "5"],
  ["a list of non-objects", "[1,2]"],
])("stored events that are %s fall back to the seed", (_label, value) => {
  const storage = new FakeStorage();
  new LocalStore({ storage, now, newId });
  storage.setItem("likeminded:v1:events", value);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(new LocalStore({ storage, now, newId }).listEvents()).toHaveLength(SEED.events.length);
  warn.mockRestore();
});

test("data from another version is ignored and re-seeded", () => {
  const storage = new FakeStorage();
  storage.setItem("likeminded:v0:members", "[]");
  expect(new LocalStore({ storage, now, newId }).listMembers()).toHaveLength(300);
});

test("throwing storage falls back to memory and keeps working", () => {
  const store = new LocalStore({ storage: new ThrowingStorage(), now, newId });
  const m = store.addMember(elif);
  expect(store.listMembers()).toContainEqual(m);
});

test("null storage works in memory", () => {
  const store = new LocalStore({ storage: null, now, newId });
  expect(store.listMembers()).toHaveLength(300);
});

test("current member id round-trips; clearing it keeps members", () => {
  const storage = new FakeStorage();
  const store = new LocalStore({ storage, now, newId });
  const m = store.addMember(elif);
  store.setCurrentMemberId(m.id);
  expect(new LocalStore({ storage, now, newId }).getCurrentMemberId()).toBe(m.id);
  store.setCurrentMemberId(null);
  expect(store.getCurrentMemberId()).toBeNull();
  expect(store.listMembers()).toContainEqual(m);
});

test("reset restores the seed and forgets the current member", () => {
  const store = new LocalStore({ storage: new FakeStorage(), now, newId });
  const m = store.addMember(elif);
  store.setCurrentMemberId(m.id);
  store.reset();
  expect(store.listMembers()).toHaveLength(300);
  expect(store.getCurrentMemberId()).toBeNull();
});

test("subscribe is called on writes; unsubscribe stops it", () => {
  const store = new LocalStore({ storage: new FakeStorage(), now, newId });
  const listener = vi.fn();
  const off = store.subscribe(listener);
  store.addMember(elif);
  expect(listener).toHaveBeenCalledTimes(1);
  off();
  store.addMember(elif);
  expect(listener).toHaveBeenCalledTimes(1);
});
