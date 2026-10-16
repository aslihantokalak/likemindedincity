export type Intent = "friendship" | "networking" | "hobby_partner";
export type GroupSize = "small" | "medium"; // 4 | 5–6
export type Slot = string; // e.g. "thu_evening", "sat_morning"

export type User = {
  id: string; name: string; age: number;
  district: string; province?: string; coords: [number, number];
  languages: string[];
  intent: Intent;
  availability: Slot[];
  interests: string[]; // controlled vocabulary
  books: string[]; authors: string[];
  profession: string; industry: string;
  schools: string[];
  groupSizePref: GroupSize;
  persona?: "newcomer" | "introvert_reader" | "founder"; // analytics only, never read by matching
};

export type Signal = "interests" | "books" | "profession" | "schools";
export type FilterName = "distance" | "province" | "availability" | "language" | "age" | "intent";

/** "distance": within MAX_DISTANCE_KM (Match Simulator). "province": same province (live app). */
export type LocationRule = "distance" | "province";

export type MatchWeights = {
  interests: number; books: number; profession: number; schools: number;
  diversity: number; // 0–1
};

export type Reason = { signal: Signal; text: string };

export type Group = {
  members: string[];
  slot: Slot; venueDistrict: string;
  cohesion: number;
  reasons: Reason[];
};

export type MatchResult = { groups: Group[]; unmatched: { userId: string; reason: string }[] };

export type BacklogItem = {
  id: string; type: "epic" | "story" | "task"; parentId?: string;
  title: string; userStory?: string; acceptanceCriteria?: string[];
  reach: number; // users affected per quarter
  impact: 0.25 | 0.5 | 1 | 2 | 3;
  confidence: 0.5 | 0.8 | 1;
  effort: number; // person-weeks
  status: "backlog" | "next" | "in_progress" | "done";
  sprint?: number;
  prdRef?: string; // e.g. "FR-3"
};

// ---- Live app ----

export type Rsvp = "coming" | "declined";
export type AttendanceStatus = "came" | "no_show" | "unknown";

export type Member = {
  id: string; createdAt: string; // ISO
  firstName: string; age: number;
  province: string; district: string;
  intent: Intent; interests: string[];
  book?: string; idea?: string;
  availability: Slot[]; languages: string[];
  tableSize: GroupSize; // "small" = 4, "medium" = up to 6
  school?: string; profession?: string; // profession from the vocabulary or free text
};

export type NewMember = Omit<Member, "id" | "createdAt">;

export type Venue = { name: string; type: "cafe" | "bookshop" | "park" | "studio" | "bar"; district: string };

export type MeetupEvent = {
  id: string; province: string; district: string; venue: Venue;
  startsAt: string; capacity: 4 | 6;
  memberIds: string[]; reasons: Reason[]; cohesion: number;
  status: "upcoming" | "past" | "cancelled";
  rsvps: Record<string, Rsvp>; attendance: Record<string, AttendanceStatus>;
};

export type Feedback = { eventId: string; memberId: string; rating: 1 | 2 | 3 | 4 | 5; meetAgain: string[] };

/**
 * Demo data with relative times, so the demo always looks current.
 * Members: created `createdDaysAgo` days before today at local `createdMinuteOfDay`.
 * Events: `startsOffsetMin` minutes from SEED_REFERENCE moved forward by whole weeks to the first Monday ≥ now
 * (keeps weekday and time of day; past events are ≥ 7 days before the reference so they stay in the past).
 */
export type SeedData = {
  members: (Omit<Member, "createdAt"> & { createdDaysAgo: number; createdMinuteOfDay: number })[];
  events: (Omit<MeetupEvent, "startsAt"> & { startsOffsetMin: number })[];
  feedback: Feedback[];
};
