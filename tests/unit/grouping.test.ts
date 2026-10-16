import { buildGroups, explainGroup, checkPair, DEFAULT_WEIGHTS } from "../../src/domain/matching";
import { USERS } from "../../src/data/users";
import type { MatchWeights, User } from "../../src/domain/types";
import { mkUser } from "./helpers";

const byId = (id: string) => USERS.find(u => u.id === id)!;
const r = buildGroups(USERS, DEFAULT_WEIGHTS);

function expectHardFiltersHold(weights: MatchWeights) {
  buildGroups(USERS, weights).groups.forEach(g => {
    const ms = g.members.map(byId);
    for (const a of ms) for (const b of ms) if (a !== b) expect(checkPair(a, b).ok).toBe(true);
    ms.forEach(m => expect(m.availability).toContain(g.slot));
  });
}

test("group sizes are 4-6", () => r.groups.forEach(g => {
  expect(g.members.length).toBeGreaterThanOrEqual(4); expect(g.members.length).toBeLessThanOrEqual(6);
}));

test("every user is in exactly one group or unmatched", () => {
  const ids = [...r.groups.flatMap(g => g.members), ...r.unmatched.map(u => u.userId)];
  expect(ids.sort()).toEqual(USERS.map(u => u.id).sort());
});

test("members pairwise pass hard filters and share the slot", () => expectHardFiltersHold(DEFAULT_WEIGHTS));

test("deterministic", () => expect(buildGroups(USERS, DEFAULT_WEIGHTS)).toEqual(r));

test("edge-no-slot is unmatched with availability reason", () =>
  expect(r.unmatched.find(u => u.userId === "edge-no-slot")?.reason).toMatch(/availability/));

test("forms at least 5 groups with default weights", () => expect(r.groups.length).toBeGreaterThanOrEqual(5));

test("diversity 1.0 still respects hard filters", () => expectHardFiltersHold({ ...DEFAULT_WEIGHTS, diversity: 1 }));

test("all weights zero: no NaN", () => {
  const z = buildGroups(USERS, { interests: 0, books: 0, profession: 0, schools: 0, diversity: 0 });
  z.groups.forEach(g => expect(Number.isNaN(g.cohesion)).toBe(false));
});

test("reasons are human readable", () => r.groups.forEach(g =>
  g.reasons.forEach(x => expect(x.text).toMatch(/^\d+ of \d+ /))));

test("changing weights changes grouping", () =>
  expect(buildGroups(USERS, { ...DEFAULT_WEIGHTS, books: 1, interests: 0 })).not.toEqual(r));

test("explainGroup reports shared authors and caps at 3 reasons", () => {
  const shared = { authors: ["Sabahattin Ali"], interests: ["chess"], schools: ["METU"], profession: "Editor" };
  const ms: User[] = [mkUser(shared), mkUser(shared), mkUser(shared), mkUser({})];
  const reasons = explainGroup(ms);
  expect(reasons).toHaveLength(3);
  expect(reasons.map(x => x.text)).toContain("3 of 4 read Sabahattin Ali");
});

test("too few compatible users gives the not-enough reason", () => {
  const few = [mkUser({}), mkUser({}), mkUser({})];
  const res = buildGroups(few, DEFAULT_WEIGHTS);
  expect(res.groups).toHaveLength(0);
  expect(res.unmatched.map(u => u.reason)).toEqual(Array(3).fill("Not enough compatible users for a group of 4"));
});

test("a book and its author shared by the same members yield one reason", () => {
  const s = { books: ["Sapiens"], authors: ["Yuval Noah Harari"] };
  const reasons = explainGroup([
    mkUser({ ...s, profession: "Chef" }), mkUser({ ...s, profession: "Doctor" }),
    mkUser({ profession: "Lawyer" }), mkUser({ profession: "Editor" }),
  ]).map(x => x.text);
  expect(reasons).toEqual(["2 of 4 read Sapiens"]);
});

test("users with compatible partners are not labelled 'No compatible users'", () => {
  const compatibleCount = (u: User) => USERS.filter(o => o.id !== u.id && checkPair(u, o).ok).length;
  r.unmatched.forEach(({ userId, reason }) => {
    if (compatibleCount(byId(userId)) > 0) expect(reason).not.toMatch(/^No compatible users/);
    else expect(reason).toMatch(/^No compatible users/);
  });
});
