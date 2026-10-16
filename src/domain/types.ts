export type Intent = "friendship" | "networking" | "hobby_partner";
export type GroupSize = "small" | "medium"; // 4 | 5–6
export type Slot = string; // e.g. "thu_evening", "sat_morning"

export type User = {
  id: string; name: string; age: number;
  district: string; coords: [number, number];
  languages: string[];
  intent: Intent;
  availability: Slot[];
  interests: string[]; // controlled vocabulary
  books: string[]; authors: string[];
  profession: string; industry: string;
  schools: string[];
  groupSizePref: GroupSize;
  persona: "newcomer" | "introvert_reader" | "founder"; // analytics only, never read by matching
};

export type Signal = "interests" | "books" | "profession" | "schools";
export type FilterName = "distance" | "availability" | "language" | "age" | "intent";

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
