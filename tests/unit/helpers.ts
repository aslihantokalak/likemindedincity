import type { User } from "../../src/domain/types";

let counter = 0;

/** A compatible-by-default user in Kadıköy; override only what the test is about. */
export function mkUser(overrides: Partial<User> = {}): User {
  counter += 1;
  return {
    id: `t${counter}`, name: `Test ${counter}`, age: 28,
    district: "Kadıköy", coords: [40.9909, 29.0303],
    languages: ["tr"], intent: "friendship", availability: ["thu_evening"],
    interests: [], books: [], authors: [],
    profession: "Teacher", industry: "education", schools: [],
    groupSizePref: "medium", persona: "newcomer",
    ...overrides,
  };
}
