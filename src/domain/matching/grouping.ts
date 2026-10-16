import type { Group, LocationRule, MatchResult, MatchWeights, Reason, Signal, User } from "../types";
import { byString } from "../compare";
import { checkPair, sharedSlots, topBlockingFilterFor } from "./filters";
import { pairScore } from "./score";

const MIN_GROUP = 4;
const MAX_REASONS = 3;

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Share of the candidate's interests that nobody in the group has yet. */
function novelty(c: User, group: User[]): number {
  const present = new Set(group.flatMap(m => m.interests));
  return c.interests.filter(i => !present.has(i)).length / Math.max(1, c.interests.length);
}

function cohesion(members: User[], w: MatchWeights): number {
  const scores: number[] = [];
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++) scores.push(pairScore(members[i], members[j], w).score);
  return mean(scores);
}

/** Most common district among members; ties alphabetical. */
function venueDistrict(members: User[]): string {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.district, (counts.get(m.district) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || byString(a[0], b[0]))[0][0];
}

/** Up to three "k of n …" reasons for things at least two members share. */
export function explainGroup(members: User[]): Reason[] {
  const n = members.length;
  const candidates: (Reason & { k: number })[] = [];
  const seen = new Set<string>(); // signal + exact member set, so a book and its author don't both appear
  const tally = (signal: Signal, values: (u: User) => string[], phrase: (v: string) => string) => {
    const holders = new Map<string, string[]>();
    for (const m of members) for (const v of new Set(values(m))) holders.set(v, [...(holders.get(v) ?? []), m.id]);
    for (const [v, ids] of holders) {
      const key = `${signal}:${ids.join(",")}`;
      if (ids.length < 2 || seen.has(key)) continue;
      seen.add(key);
      candidates.push({ signal, k: ids.length, text: `${ids.length} of ${n} ${phrase(v)}` });
    }
  };
  tally("books", u => [...u.books, ...u.authors], v => `read ${v}`);
  tally("interests", u => u.interests, v => `are into ${v}`);
  tally("schools", u => u.schools, v => `went to ${v}`);
  tally("profession", u => [u.profession], v => `work as ${v}`);
  return candidates
    .sort((a, b) => b.k - a.k || byString(a.text, b.text))
    .slice(0, MAX_REASONS)
    .map(({ signal, text }) => ({ signal, text }));
}

export function buildGroups(users: User[], w: MatchWeights, rule: LocationRule = "distance"): MatchResult {
  const sorted = [...users].sort((a, b) => byString(a.id, b.id));

  const pairs: { a: User; b: User; score: number; key: string }[] = [];
  for (let i = 0; i < sorted.length; i++)
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      if (checkPair(a, b, rule).ok) pairs.push({ a, b, score: pairScore(a, b, w).score, key: `${a.id}|${b.id}` });
    }
  pairs.sort((p, q) => q.score - p.score || byString(p.key, q.key));

  const assigned = new Set<string>();
  const groups: Group[] = [];

  for (const { a, b } of pairs) {
    if (assigned.has(a.id) || assigned.has(b.id)) continue;
    const group = [a, b];
    const target = a.groupSizePref === "small" && b.groupSizePref === "small" ? 4 : 6;

    while (group.length < target) {
      let best: { user: User; fitness: number } | null = null;
      for (const c of sorted) {
        if (assigned.has(c.id) || group.includes(c)) continue;
        if (!group.every(m => checkPair(c, m, rule).ok)) continue;
        if (sharedSlots([...group, c]).length === 0) continue;
        const fitness = (1 - w.diversity) * mean(group.map(m => pairScore(c, m, w).score)) + w.diversity * novelty(c, group);
        if (best === null || fitness > best.fitness) best = { user: c, fitness }; // sorted by id, so ties keep the smallest id
      }
      if (best === null) break;
      group.push(best.user);
    }

    if (group.length >= MIN_GROUP) {
      group.forEach(m => assigned.add(m.id));
      groups.push({
        members: group.map(m => m.id),
        slot: sharedSlots(group)[0],
        venueDistrict: venueDistrict(group),
        cohesion: cohesion(group, w),
        reasons: explainGroup(group),
      });
    }
  }

  const unmatched = sorted
    .filter(u => !assigned.has(u.id))
    .map(u => {
      const blocker = topBlockingFilterFor(u, sorted, rule);
      const hasPartner = sorted.some(o => o.id !== u.id && checkPair(u, o, rule).ok);
      const notEnough = "Not enough compatible users for a group of 4";
      let reason: string;
      if (blocker === null) reason = notEnough;
      else if (hasPartner) reason = `${notEnough} (most blocked by: ${blocker})`;
      else reason = `No compatible users (most blocked by: ${blocker})`;
      return { userId: u.id, reason };
    });

  return { groups, unmatched };
}
