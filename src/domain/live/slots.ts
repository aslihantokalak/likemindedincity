import type { Slot } from "../types";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const PARTS = ["morning", "afternoon", "evening"] as const;
const DAY_NAMES: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** Every day × part of day, Monday morning first. */
export const LIVE_SLOTS: Slot[] = DAYS.flatMap(d => PARTS.map(p => `${d}_${p}`));

/** Local start time of each part of the day. */
export const SLOT_START: Record<string, [number, number]> = { morning: [10, 0], afternoon: [14, 0], evening: [19, 30] };

/** "thu_evening" → "Thursday evening" */
export function slotLabel(slot: Slot): string {
  const [day, part] = slot.split("_");
  return `${DAY_NAMES[day ?? ""] ?? day} ${part ?? ""}`.trim();
}

/** Meetups happen in Turkey, so slots and times are always İstanbul time (UTC+3 all year; no DST since 2016). */
export const MEETUP_TIME_ZONE = "Europe/Istanbul";
const OFFSET_MS = 3 * 3_600_000;

/** Calendar fields of `d` as seen on a clock in İstanbul, whatever the visitor's own time zone. */
export function istanbulParts(d: Date) {
  const t = new Date(d.getTime() + OFFSET_MS);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth(), day: t.getUTCDate(), weekday: (t.getUTCDay() + 6) % 7, hour: t.getUTCHours(), minute: t.getUTCMinutes() };
}

/** The instant of an İstanbul wall-clock time. Day overflow is allowed (day 32 → next month). */
export function istanbulTime(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month, day, hour, minute) - OFFSET_MS);
}

/** The next İstanbul date-time for `slot` that is at least `minLeadHours` after `now`. */
export function nextOccurrence(slot: Slot, now: Date, minLeadHours = 48): Date {
  const [day, part] = slot.split("_");
  const dayIndex = DAYS.indexOf(day as (typeof DAYS)[number]); // 0 = Monday
  const start = SLOT_START[part ?? ""];
  if (dayIndex < 0 || !start) throw new Error(`Unknown slot: ${slot}`);
  const minTime = now.getTime() + minLeadHours * 3_600_000;
  const today = istanbulParts(now);
  for (let offset = 0; offset < 15; offset++) {
    const d = istanbulTime(today.year, today.month, today.day + offset, start[0], start[1]);
    if (istanbulParts(d).weekday === dayIndex && d.getTime() >= minTime) return d;
  }
  throw new Error("unreachable");
}

/** The slot an instant falls in, on İstanbul's clock: before 12:00 morning, before 17:00 afternoon, else evening. */
export function slotAt(d: Date): Slot {
  const { weekday, hour } = istanbulParts(d);
  return `${DAYS[weekday]!}_${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}`;
}
