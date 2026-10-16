import { MODULES } from "../../src/lib/modules";

test("ten modules in spec order", () => {
  expect(MODULES.map(m => m.title)).toEqual([
    "Overview", "Discovery", "PRD", "Backlog", "Wireframes", "Prototype",
    "Technical Design", "Decision Log", "Analytics", "Retrospective"]);
});

test("slugs are unique", () => {
  expect(new Set(MODULES.map(m => m.slug)).size).toBe(10);
});

test("M1 modules", () => {
  expect(MODULES.filter(m => m.milestone === "M1").map(m => m.slug))
    .toEqual(["", "technical-design", "decision-log"]);
});
