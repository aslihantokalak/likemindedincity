import type { MatchWeights, MeetupEvent, Member, Reason, Slot, User } from "../types";
import { byString } from "../compare";
import { buildGroups, checkPair, explainGroup, pairScore, sharedSlots } from "../matching";
import { toMatchUser } from "./member";
import { nextOccurrence, slotAt } from "./slots";
import { pickVenue } from "./venues";

export type LiveState = { members: Member[]; events: MeetupEvent[] };

export type SeatResult =
  | { kind: "seated"; event: MeetupEvent } // joined an existing upcoming event
  | { kind: "new"; event: MeetupEvent } // formed a new table
  | { kind: "waitlist"; needed: number };

const MIN_TABLE = 4;
const MIN_LEAD_MS = 48 * 3_600_000; // same lead time as new tables
const RULE = "province" as const;

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

function lookup(state: LiveState): (id: string) => Member {
  const byId = new Map(state.members.map(m => [m.id, m]));
  return id => {
    const m = byId.get(id);
    if (!m) throw new Error(`Unknown member ${id}`);
    return m;
  };
}

/** Upcoming means not cancelled or marked past, and not yet started. Stored data ages, so time decides. */
export const isUpcoming = (e: MeetupEvent, now: Date) => e.status === "upcoming" && new Date(e.startsAt) > now;

export const isUnderFilled = (e: MeetupEvent): boolean => e.status === "upcoming" && e.memberIds.length < MIN_TABLE;

/** Members of the province who are not seated at any upcoming event, by id. */
export function unplacedMembers(province: string, state: LiveState, now: Date): Member[] {
  const seated = new Set(state.events.filter(e => isUpcoming(e, now)).flatMap(e => e.memberIds));
  return state.members
    .filter(m => m.province === province && !seated.has(m.id))
    .sort((a, b) => byString(a.id, b.id));
}

/** Mean similarity of a candidate to the people already at a table. */
function fit(candidate: User, table: User[], w: MatchWeights): number {
  return mean(table.map(t => pairScore(candidate, t, w).score));
}

/** Can `candidate` sit with everyone at `table` in this slot? */
function canJoin(candidate: User, table: User[], slot: Slot): boolean {
  return candidate.availability.includes(slot) && table.every(t => checkPair(candidate, t, RULE).ok);
}

function cohesionOf(users: User[], w: MatchWeights): number {
  const scores: number[] = [];
  for (let i = 0; i < users.length; i++)
    for (let j = i + 1; j < users.length; j++) scores.push(pairScore(users[i]!, users[j]!, w).score);
  return mean(scores);
}

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || byString(a[0], b[0]))[0]?.[0];
}

function withExplanation(e: MeetupEvent, members: Member[], w: MatchWeights): MeetupEvent {
  const users = members.map(toMatchUser);
  const reasons: Reason[] = explainGroup(users);
  return { ...e, reasons, cohesion: cohesionOf(users, w) };
}

function newEvent(members: Member[], now: Date, w: MatchWeights, newId: () => string): MeetupEvent {
  const users = members.map(toMatchUser);
  const slot = sharedSlots(users)
    .map(s => ({ s, at: nextOccurrence(s, now) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0]!;
  const province = members[0]!.province;
  const district = mostCommon(members.map(m => m.district))!;
  const venue = pickVenue(province, district, mostCommon(members.flatMap(m => m.interests)));
  const event: MeetupEvent = {
    id: newId(), province, district: venue.district, venue,
    startsAt: slot.at.toISOString(),
    capacity: members.every(m => m.tableSize === "small") ? 4 : 6,
    memberIds: members.map(m => m.id), reasons: [], cohesion: 0,
    status: "upcoming", rsvps: {}, attendance: {},
  };
  return withExplanation(event, members, w);
}

/** Members of the province who could sit with `memberId`, excluding anyone already seated. */
function compatibleUnplaced(member: Member, state: LiveState, now: Date): Member[] {
  const u = toMatchUser(member);
  return unplacedMembers(member.province, state, now)
    .filter(o => o.id !== member.id && checkPair(u, toMatchUser(o), RULE).ok);
}

export function waitlistNeeded(memberId: string, state: LiveState, now: Date): number {
  const member = lookup(state)(memberId);
  return Math.max(1, MIN_TABLE - 1 - compatibleUnplaced(member, state, now).length);
}

/**
 * Builds the best table that includes `member`: repeatedly adds the unplaced member of the province who fits
 * the table best, can sit with everyone, and keeps a shared free slot. Stops at 4 for a "small" seeker, else 6.
 */
function growTableAround(member: Member, state: LiveState, now: Date, w: MatchWeights): Member[] {
  const target = member.tableSize === "small" ? 4 : 6;
  const table: Member[] = [member];
  const pool = unplacedMembers(member.province, state, now).filter(m => m.id !== member.id);
  while (table.length < target) {
    const users = table.map(toMatchUser);
    const next = pool
      .filter(c => !table.includes(c))
      .map(c => ({ c, u: toMatchUser(c) }))
      .filter(({ u }) => users.every(t => checkPair(u, t, RULE).ok) && sharedSlots([...users, u]).length > 0)
      .map(({ c, u }) => ({ c, score: fit(u, users, w) }))
      .sort((a, b) => b.score - a.score || byString(a.c.id, b.c.id))[0];
    if (!next) break;
    table.push(next.c);
  }
  return table;
}

/**
 * Finds a table for a member: an open seat at a compatible upcoming event first, then a new table with
 * unplaced members of the same province, otherwise the waitlist. Never moves anyone else.
 */
export function seatMember(
  memberId: string, state: LiveState, now: Date, w: MatchWeights, newId: () => string,
): { result: SeatResult; events: MeetupEvent[] } {
  const get = lookup(state);
  const member = get(memberId);
  const me = toMatchUser(member);

  const already = state.events.find(e => isUpcoming(e, now) && e.memberIds.includes(memberId));
  if (already) return { result: { kind: "seated", event: already }, events: state.events };

  const open = state.events
    .filter(e => isUpcoming(e, now) && new Date(e.startsAt).getTime() - now.getTime() >= MIN_LEAD_MS)
    .filter(e => e.province === member.province && e.memberIds.length < e.capacity)
    .map(e => ({ e, table: e.memberIds.map(get).map(toMatchUser) }))
    .filter(({ e, table }) => canJoin(me, table, slotAt(new Date(e.startsAt))))
    .map(({ e, table }) => ({ e, score: fit(me, table, w) }))
    .sort((a, b) => b.score - a.score || byString(a.e.id, b.e.id));
  if (open.length > 0) {
    const target = open[0]!.e;
    const seated = withExplanation({ ...target, memberIds: [...target.memberIds, memberId] }, [...target.memberIds, memberId].map(get), w);
    return { result: { kind: "seated", event: seated }, events: state.events.map(e => (e.id === seated.id ? seated : e)) };
  }

  const table = growTableAround(member, state, now, w);
  if (table.length >= MIN_TABLE) {
    const event = newEvent(table, now, w, newId);
    return { result: { kind: "new", event }, events: [...state.events, event] };
  }

  return { result: { kind: "waitlist", needed: waitlistNeeded(memberId, state, now) }, events: state.events };
}

/** Releases a member's seat and tries to bring the table back to 4 from the province's unplaced pool. */
export function declineSeat(eventId: string, memberId: string, state: LiveState, now: Date, w: MatchWeights): MeetupEvent[] {
  const get = lookup(state);
  const event = state.events.find(e => e.id === eventId);
  if (!event || !event.memberIds.includes(memberId)) return state.events;

  const { [memberId]: _dropped, ...rsvps } = event.rsvps;
  let updated: MeetupEvent = { ...event, memberIds: event.memberIds.filter(id => id !== memberId), rsvps };
  const slot = slotAt(new Date(event.startsAt));

  while (updated.memberIds.length < MIN_TABLE) {
    const current = { ...state, events: state.events.map(e => (e.id === eventId ? updated : e)) };
    const table = updated.memberIds.map(get).map(toMatchUser);
    const candidate = unplacedMembers(event.province, current, now)
      .filter(m => m.id !== memberId)
      .map(toMatchUser)
      .filter(c => canJoin(c, table, slot))
      .map(c => ({ c, score: fit(c, table, w) }))
      .sort((a, b) => b.score - a.score || byString(a.c.id, b.c.id))[0];
    if (!candidate) break;
    updated = { ...updated, memberIds: [...updated.memberIds, candidate.c.id] };
  }

  updated = withExplanation(updated, updated.memberIds.map(get), w);
  return state.events.map(e => (e.id === eventId ? updated : e));
}

/** Forms new tables from every unplaced member of a province. Returns only the new events. */
export function formTables(province: string, state: LiveState, now: Date, w: MatchWeights, newId: () => string): MeetupEvent[] {
  const get = lookup(state);
  const pool = unplacedMembers(province, state, now);
  return buildGroups(pool.map(toMatchUser), w, RULE).groups.map(g => newEvent(g.members.map(get), now, w, newId));
}

/** The member's upcoming event, else their most recent past one. */
export function currentEventFor(memberId: string, state: LiveState, now: Date): MeetupEvent | undefined {
  const mine = state.events.filter(e => e.status !== "cancelled" && e.memberIds.includes(memberId));
  const upcoming = mine.find(e => isUpcoming(e, now));
  if (upcoming) return upcoming;
  return mine
    .filter(e => new Date(e.startsAt) <= now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
}
