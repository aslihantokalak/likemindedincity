import { USERS } from "../../src/data/users";
import { generateUsers } from "../../scripts/generate-users";
import { INTERESTS } from "../../src/data/vocab";

test("50 users with unique ids", () => {
  expect(USERS).toHaveLength(50);
  expect(new Set(USERS.map(u => u.id)).size).toBe(50);
});

test("generator is deterministic", () => {
  expect(generateUsers(42, 50)).toEqual(generateUsers(42, 50));
  expect(generateUsers(42, 50)).toEqual(USERS);
});

test("edge cases present", () => {
  for (const id of ["edge-no-slot", "edge-english-only", "edge-rare-intent"])
    expect(USERS.find(u => u.id === id)).toBeDefined();
});

test("all values come from vocab", () => {
  const tags = new Set(INTERESTS);
  for (const u of USERS) u.interests.forEach(t => expect(tags.has(t)).toBe(true));
});
