import type { FilterName, LocationRule, Slot, User } from "../types";
import { byString } from "../compare";

export const MAX_DISTANCE_KM = 12;
export const MAX_AGE_GAP = 12;

/** Order in which hard filters are checked; also the tie-break order for "most blocking". */
export function filterOrder(rule: LocationRule = "distance"): FilterName[] {
  return [rule, "availability", "language", "age", "intent"];
}

export const FILTER_ORDER: FilterName[] = filterOrder("distance");

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Slots every user is available in, sorted. */
export function sharedSlots(users: User[]): Slot[] {
  if (users.length === 0) return [];
  return users[0].availability
    .filter(s => users.every(u => u.availability.includes(s)))
    .sort(byString);
}

const passes: Record<FilterName, (a: User, b: User) => boolean> = {
  distance: (a, b) => distanceKm(a.coords, b.coords) <= MAX_DISTANCE_KM,
  province: (a, b) => a.province !== undefined && a.province === b.province,
  availability: (a, b) => sharedSlots([a, b]).length > 0,
  language: (a, b) => a.languages.some(l => b.languages.includes(l)),
  age: (a, b) => Math.abs(a.age - b.age) <= MAX_AGE_GAP,
  intent: (a, b) => a.intent === b.intent,
};

export function checkPair(a: User, b: User, rule: LocationRule = "distance"): { ok: true } | { ok: false; failed: FilterName } {
  for (const f of filterOrder(rule)) if (!passes[f](a, b)) return { ok: false, failed: f };
  return { ok: true };
}

const emptyStats = (): Record<FilterName, number> =>
  ({ distance: 0, province: 0, availability: 0, language: 0, age: 0, intent: 0 });

/** For every pair, count the first filter that rejected it. */
export function blockingStats(users: User[], rule: LocationRule = "distance"): Record<FilterName, number> {
  const stats = emptyStats();
  for (let i = 0; i < users.length; i++)
    for (let j = i + 1; j < users.length; j++) {
      const r = checkPair(users[i], users[j], rule);
      if (!r.ok) stats[r.failed] += 1;
    }
  return stats;
}

function top(stats: Record<FilterName, number>, rule: LocationRule): FilterName | null {
  let best: FilterName | null = null;
  for (const f of filterOrder(rule)) if (stats[f] > 0 && (best === null || stats[f] > stats[best])) best = f;
  return best;
}

export function topBlockingFilter(users: User[], rule: LocationRule = "distance"): FilterName | null {
  return top(blockingStats(users, rule), rule);
}

/** Like topBlockingFilter, but only over pairs that include `user`. */
export function topBlockingFilterFor(user: User, others: User[], rule: LocationRule = "distance"): FilterName | null {
  const stats = emptyStats();
  for (const o of others) {
    if (o.id === user.id) continue;
    const r = checkPair(user, o, rule);
    if (!r.ok) stats[r.failed] += 1;
  }
  return top(stats, rule);
}
