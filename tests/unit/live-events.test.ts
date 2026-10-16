import {
  currentEventFor, declineSeat, formTables, isUnderFilled, seatMember, unplacedMembers, waitlistNeeded,
} from "../../src/domain/live/events";
import { DEFAULT_WEIGHTS } from "../../src/domain/matching";
import type { Member } from "../../src/domain/types";
import { mkEvent, mkMember } from "./helpers";

const now = new Date("2026-10-19T09:00:00+03:00"); // Monday
const W = DEFAULT_WEIGHTS;
let n = 0;
const newId = () => `new-${++n}`;
const four = (o: Partial<Member> = {}) => [mkMember(o), mkMember(o), mkMember(o), mkMember(o)];

test("seats a newcomer into a compatible event with an open seat", () => {
  const table = four();
  const me = mkMember({ id: "me" });
  const event = mkEvent(table.map(m => m.id));
  const { result, events } = seatMember("me", { members: [...table, me], events: [event] }, now, W, newId);
  expect(result.kind).toBe("seated");
  if (result.kind === "seated") expect(result.event.memberIds).toEqual([...event.memberIds, "me"]);
  expect(events).toHaveLength(1);
  expect(events[0]!.reasons.length).toBeGreaterThan(0);
});

test("never seats into an event in another province", () => {
  const table = four({ province: "Ankara", district: "Çankaya" });
  const me = mkMember({ id: "me" });
  const { result } = seatMember("me", { members: [...table, me], events: [mkEvent(table.map(m => m.id), { province: "Ankara" })] }, now, W, newId);
  expect(result).toEqual({ kind: "waitlist", needed: 3 });
});

test("never seats into a full event", () => {
  const table = [...four(), mkMember(), mkMember()];
  const me = mkMember({ id: "me" });
  const { result } = seatMember("me", { members: [...table, me], events: [mkEvent(table.map(m => m.id))] }, now, W, newId);
  expect(result.kind).toBe("waitlist");
});

test("never seats into an event at a time the newcomer isn't free", () => {
  const table = four();
  const me = mkMember({ id: "me", availability: ["sat_morning"] });
  const { result } = seatMember("me", { members: [...table, me], events: [mkEvent(table.map(m => m.id))] }, now, W, newId);
  expect(result.kind).toBe("waitlist");
});

test("never seats next to someone who fails a hard filter", () => {
  const table = [...four().slice(0, 3), mkMember({ intent: "networking" })];
  const me = mkMember({ id: "me" });
  const { result } = seatMember("me", { members: [...table, me], events: [mkEvent(table.map(m => m.id))] }, now, W, newId);
  expect(result.kind).not.toBe("seated");
});

test("forms a new table from unplaced members when no event fits", () => {
  const pool = [...four(), mkMember({ id: "me" })];
  const { result, events } = seatMember("me", { members: pool, events: [] }, now, W, newId);
  expect(result.kind).toBe("new");
  if (result.kind === "new") {
    expect(result.event.memberIds).toContain("me");
    expect(result.event.memberIds.length).toBeGreaterThanOrEqual(4);
    expect(result.event.capacity).toBe(6);
    expect(result.event.province).toBe("İstanbul");
  }
  expect(events).toHaveLength(1);
});

test("new table starts at the earliest shared slot at least 48h away", () => {
  const pool = [...four({ availability: ["tue_evening", "thu_evening"] }), mkMember({ id: "me", availability: ["tue_evening", "thu_evening"] })];
  const { result } = seatMember("me", { members: pool, events: [] }, now, W, newId);
  if (result.kind !== "new") throw new Error("expected a new table");
  expect(result.event.startsAt).toBe(new Date("2026-10-22T19:30:00+03:00").toISOString());
});

test("an all-small table has capacity 4", () => {
  const pool = [...four({ tableSize: "small" }), mkMember({ id: "me", tableSize: "small" })];
  const { result } = seatMember("me", { members: pool, events: [] }, now, W, newId);
  if (result.kind !== "new") throw new Error("expected a new table");
  expect(result.event.capacity).toBe(4);
});

test("other members of existing events are untouched when seating", () => {
  const a = four(); const b = four();
  const me = mkMember({ id: "me" });
  const events = [mkEvent(a.map(m => m.id), { id: "ea" }), mkEvent([...b.map(m => m.id), mkMember().id, mkMember().id], { id: "eb", capacity: 6 })];
  const out = seatMember("me", { members: [...a, ...b, me], events }, now, W, newId).events;
  expect(out.find(e => e.id === "eb")!.memberIds).toEqual(events[1]!.memberIds);
});

test("a member already seated keeps their table", () => {
  const table = [...four(), mkMember({ id: "me" })];
  const event = mkEvent(table.map(m => m.id));
  const { result, events } = seatMember("me", { members: table, events: [event] }, now, W, newId);
  expect(result).toEqual({ kind: "seated", event });
  expect(events).toEqual([event]);
});

test("alone in Van → waitlist needs 3", () => {
  const van = mkMember({ id: "van1", province: "Van", district: "Tuşpa" });
  expect(seatMember("van1", { members: [van], events: [] }, now, W, newId).result).toEqual({ kind: "waitlist", needed: 3 });
});

test("two compatible unplaced members → waitlist needs 1", () => {
  const members = [mkMember({ id: "me", province: "Van" }), mkMember({ province: "Van" }), mkMember({ province: "Van" })];
  expect(waitlistNeeded("me", { members, events: [] }, now)).toBe(1);
});

test("decline backfills from the unplaced pool", () => {
  const table = four();
  const spare = mkMember({ id: "spare" });
  const event = mkEvent(table.map(m => m.id), { rsvps: { [table[0]!.id]: "coming" } });
  const out = declineSeat(event.id, table[0]!.id, { members: [...table, spare], events: [event] }, now, W);
  const updated = out[0]!;
  expect(updated.memberIds).toHaveLength(4);
  expect(updated.memberIds).toContain("spare");
  expect(updated.memberIds).not.toContain(table[0]!.id);
  expect(updated.rsvps).toEqual({ [table[0]!.id]: "declined" });
});

test("someone who declined a table is never put back at it", () => {
  const table = four();
  const event = mkEvent(table.map(m => m.id));
  const state = { members: table, events: [event] };
  const afterFirst = declineSeat(event.id, table[0]!.id, state, now, W); // table[0] is now unplaced
  const afterSecond = declineSeat(event.id, table[1]!.id, { members: table, events: afterFirst }, now, W);
  expect(afterSecond[0]!.memberIds).not.toContain(table[0]!.id);
});

test("someone who declined a table is not offered its open seat again", () => {
  const table = four();
  const me = mkMember({ id: "me" });
  const event = mkEvent(table.map(m => m.id), { rsvps: { me: "declined" } });
  const { result } = seatMember("me", { members: [...table, me], events: [event] }, now, W, newId);
  expect(result.kind).not.toBe("seated");
});

test("the decliner is never used to backfill their own seat", () => {
  const table = four();
  const event = mkEvent(table.map(m => m.id));
  const out = declineSeat(event.id, table[0]!.id, { members: table, events: [event] }, now, W);
  expect(out[0]!.memberIds).not.toContain(table[0]!.id);
});

test("decline with no candidate leaves an under-filled event and frees the decliner", () => {
  const table = four();
  const event = mkEvent(table.map(m => m.id));
  const state = { members: table, events: [event] };
  const out = declineSeat(event.id, table[0]!.id, state, now, W);
  expect(out[0]!.memberIds).toHaveLength(3);
  expect(isUnderFilled(out[0]!)).toBe(true);
  expect(unplacedMembers("İstanbul", { members: table, events: out }, now).map(m => m.id)).toEqual([table[0]!.id]);
});

test("formTables creates one event per group and never mixes provinces", () => {
  const members = [...four({ province: "Ankara", district: "Çankaya" }), ...four()];
  const out = formTables("Ankara", { members, events: [] }, now, W, newId);
  expect(out).toHaveLength(1);
  expect(out[0]!.province).toBe("Ankara");
  expect(out[0]!.memberIds.every(id => members.find(m => m.id === id)!.province === "Ankara")).toBe(true);
});

test("currentEventFor prefers the upcoming event, then the latest past one", () => {
  const table = [...four(), mkMember({ id: "me" })];
  const ids = table.map(m => m.id);
  const past1 = mkEvent(ids, { id: "p1", status: "past", startsAt: "2026-10-01T16:30:00.000Z" });
  const past2 = mkEvent(ids, { id: "p2", status: "past", startsAt: "2026-10-08T16:30:00.000Z" });
  const upcoming = mkEvent(ids, { id: "u1" });
  expect(currentEventFor("me", { members: table, events: [past1, past2, upcoming] }, now)?.id).toBe("u1");
  expect(currentEventFor("me", { members: table, events: [past1, past2] }, now)?.id).toBe("p2");
  expect(currentEventFor("nobody", { members: table, events: [past1] }, now)).toBeUndefined();
});

test("an upcoming event whose time has passed counts as past", () => {
  const table = [...four(), mkMember({ id: "me" })];
  const stale = mkEvent(table.map(m => m.id), { id: "stale", startsAt: "2026-10-18T16:30:00.000Z" });
  const ev = currentEventFor("me", { members: table, events: [stale] }, now);
  expect(ev?.id).toBe("stale");
  expect(new Date(ev!.startsAt) <= now).toBe(true);
});

describe("events whose time has passed", () => {
  const later = new Date("2026-10-28T09:00:00+03:00"); // after mkEvent's Thursday 22 Oct 19:30

  test("are not offered as open seats", () => {
    const table = four();
    const me = mkMember({ id: "me" });
    const { result } = seatMember("me", { members: [...table, me], events: [mkEvent(table.map(m => m.id))] }, later, W, newId);
    expect(result.kind).not.toBe("seated");
  });

  test("free their members for new tables", () => {
    const table = four();
    const state = { members: table, events: [mkEvent(table.map(m => m.id))] };
    expect(unplacedMembers("İstanbul", state, later).map(m => m.id)).toEqual(table.map(m => m.id));
    expect(unplacedMembers("İstanbul", state, now)).toEqual([]);
  });

  test("let a member whose table already happened find a new one", () => {
    const table = [...four(), mkMember({ id: "me" })];
    const { result } = seatMember("me", { members: table, events: [mkEvent(table.map(m => m.id))] }, later, W, newId);
    expect(result.kind).toBe("new");
  });
});

test("an open seat less than 48h away is not offered", () => {
  const table = four();
  const me = mkMember({ id: "me" });
  const soon = new Date("2026-10-21T21:00:00+03:00"); // 22.5h before the Thursday 19:30 table
  const { result } = seatMember("me", { members: [...table, me], events: [mkEvent(table.map(m => m.id))] }, soon, W, newId);
  expect(result.kind).not.toBe("seated");
});
