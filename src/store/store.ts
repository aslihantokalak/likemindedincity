import type { Feedback, MeetupEvent, Member, NewMember, Rsvp, SeedData } from "../domain/types";
import { seedBase } from "../domain/live/seed-time";
import { istanbulParts, istanbulTime } from "../domain/live/slots";

/** Everything the app reads and writes. Swap LocalStore for a backend-backed implementation to go multi-user. */
export interface Store {
  listMembers(): Member[];
  addMember(m: NewMember): Member;
  listEvents(): MeetupEvent[];
  /** Inserts or replaces events by id. */
  saveEvents(events: MeetupEvent[]): void;
  setRsvp(eventId: string, memberId: string, rsvp: Rsvp): void;
  saveFeedback(f: Feedback): void;
  listFeedback(): Feedback[];
  getCurrentMemberId(): string | null;
  setCurrentMemberId(id: string | null): void;
  /** Restores the demo data and forgets the current member. */
  reset(): void;
  subscribe(listener: () => void): () => void;
}

export type StoreData = { members: Member[]; events: MeetupEvent[]; feedback: Feedback[] };

/** Turns the relative seed into dates around `now` (see SeedData for the rules). */
export function materializeSeed(seed: SeedData, now: Date): StoreData {
  const base = seedBase(now).getTime();
  const today = istanbulParts(now);
  return {
    members: seed.members.map(({ createdDaysAgo, createdMinuteOfDay, ...m }) => ({
      ...m,
      createdAt: istanbulTime(today.year, today.month, today.day - createdDaysAgo, 0, createdMinuteOfDay).toISOString(),
    })),
    events: seed.events.map(({ startsOffsetMin, ...e }) => ({ ...e, startsAt: new Date(base + startsOffsetMin * 60_000).toISOString() })),
    feedback: seed.feedback.map(f => ({ ...f, meetAgain: [...f.meetAgain] })),
  };
}
