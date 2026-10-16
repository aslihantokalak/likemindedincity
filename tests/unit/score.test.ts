import { jaccard, signalSimilarity, pairScore, DEFAULT_WEIGHTS } from "../../src/domain/matching/score";
import { USERS } from "../../src/data/users";
import { mkUser } from "./helpers";

test("jaccard of two empty lists is 0", () => expect(jaccard([], [])).toBe(0));

test("jaccard basic", () => expect(jaccard(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3));

test("same industry, different profession = 0.5", () =>
  expect(signalSimilarity(mkUser({ profession: "PM", industry: "tech" }), mkUser({ profession: "Designer", industry: "tech" })).profession).toBe(0.5));

test("books signal includes authors", () =>
  expect(signalSimilarity(mkUser({ books: ["Huzur"], authors: ["Tanpınar"] }), mkUser({ books: ["The Time Regulation Institute"], authors: ["Tanpınar"] })).books)
    .toBeCloseTo(1 / 3));

test("score is in [0,1] and symmetric", () => {
  const a = USERS[0], b = USERS[1];
  const s1 = pairScore(a, b, DEFAULT_WEIGHTS).score, s2 = pairScore(b, a, DEFAULT_WEIGHTS).score;
  expect(s1).toBe(s2); expect(s1).toBeGreaterThanOrEqual(0); expect(s1).toBeLessThanOrEqual(1);
});

test("all weights zero gives 0, not NaN", () => {
  const r = pairScore(USERS[0], USERS[1], { interests: 0, books: 0, profession: 0, schools: 0, diversity: 0 });
  expect(r.score).toBe(0);
});

test("persona is never read", () => {
  const a = mkUser({ persona: "founder", interests: ["ai"] }), b = mkUser({ persona: "newcomer", interests: ["ai"] });
  expect(pairScore(a, b, DEFAULT_WEIGHTS)).toEqual(pairScore({ ...a, persona: "newcomer" }, b, DEFAULT_WEIGHTS));
});
