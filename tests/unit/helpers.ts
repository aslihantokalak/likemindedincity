import type { MeetupEvent, Member, User } from "../../src/domain/types";

let counter = 0;

/** A compatible-by-default user in Kadıköy; override only what the test is about. */
export function mkUser(overrides: Partial<User> = {}): User {
  counter += 1;
  return {
    id: `t${counter}`, name: `Test ${counter}`, age: 28,
    district: "Kadıköy", province: "İstanbul", coords: [40.9909, 29.0303],
    languages: ["tr"], intent: "friendship", availability: ["thu_evening"],
    interests: [], books: [], authors: [],
    profession: "Teacher", industry: "education", schools: [],
    groupSizePref: "medium", persona: "newcomer",
    ...overrides,
  };
}

let memberCounter = 0;

/** A live member in Kadıköy, free on Thursday evenings; override only what the test is about. */
export function mkMember(overrides: Partial<Member> = {}): Member {
  memberCounter += 1;
  return {
    id: `m${String(memberCounter).padStart(3, "0")}`, createdAt: "2026-10-01T18:00:00.000Z",
    firstName: `Member ${memberCounter}`, age: 30,
    province: "İstanbul", district: "Kadıköy",
    intent: "friendship", interests: ["hiking", "chess", "jazz"],
    availability: ["thu_evening"], languages: ["Turkish"], tableSize: "medium",
    ...overrides,
  };
}

/** An upcoming İstanbul event next Thursday 19:30 (relative to 2026-10-19). */
export function mkEvent(memberIds: string[], overrides: Partial<MeetupEvent> = {}): MeetupEvent {
  return {
    id: `e-${memberIds.join("-")}`, province: "İstanbul", district: "Kadıköy",
    venue: { name: "Kadıköy Corner Café", type: "cafe", district: "Kadıköy" },
    startsAt: new Date("2026-10-22T19:30:00+03:00").toISOString(), capacity: 6,
    memberIds, reasons: [], cohesion: 0, status: "upcoming", rsvps: {}, attendance: {},
    ...overrides,
  };
}
