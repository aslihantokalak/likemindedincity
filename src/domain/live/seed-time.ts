/** Monday 00:00 in İstanbul. Seed event times are stored as minutes from here. */
export const SEED_REFERENCE = "2026-10-19T00:00:00+03:00";

const WEEK_MS = 7 * 86_400_000;

/** SEED_REFERENCE moved forward by whole weeks to the first such Monday at or after `now`. */
export function seedBase(now: Date): Date {
  const ref = new Date(SEED_REFERENCE).getTime();
  return new Date(ref + Math.ceil((now.getTime() - ref) / WEEK_MS) * WEEK_MS);
}
