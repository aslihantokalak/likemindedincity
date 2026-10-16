import { riceScore, rankBacklog } from "../../src/domain/rice";
import type { BacklogItem } from "../../src/domain/types";

const mk = (id: string, reach: number): BacklogItem => ({
  id, type: "story", title: id, reach, impact: 1, confidence: 1, effort: 1, status: "backlog",
});

test("riceScore = reach*impact*confidence/effort", () => {
  expect(riceScore({ reach: 1000, impact: 2, confidence: 0.8, effort: 4 })).toBe(400);
});

test("effort 0 is treated as 0.5 to avoid Infinity", () => {
  expect(riceScore({ reach: 100, impact: 1, confidence: 1, effort: 0 })).toBe(200);
});

test("rankBacklog sorts desc, ties by id, does not mutate", () => {
  const items = [mk("b", 100), mk("a", 100), mk("c", 300)];
  const ranked = rankBacklog(items);
  expect(ranked.map(i => i.id)).toEqual(["c", "a", "b"]);
  expect(items.map(i => i.id)).toEqual(["b", "a", "c"]);
});
