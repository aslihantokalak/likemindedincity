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

/** The next local date-time for `slot` that is at least `minLeadHours` after `now`. */
export function nextOccurrence(slot: Slot, now: Date, minLeadHours = 48): Date {
  const [day, part] = slot.split("_");
  const dayIndex = DAYS.indexOf(day as (typeof DAYS)[number]); // 0 = Monday
  const start = SLOT_START[part ?? ""];
  if (dayIndex < 0 || !start) throw new Error(`Unknown slot: ${slot}`);
  const minTime = now.getTime() + minLeadHours * 3_600_000;
  for (let offset = 0; offset < 15; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, start[0], start[1]);
    if ((d.getDay() + 6) % 7 === dayIndex && d.getTime() >= minTime) return d;
  }
  throw new Error("unreachable");
}

/** The slot a local date-time falls in: before 12:00 morning, before 17:00 afternoon, else evening. */
export function slotAt(d: Date): Slot {
  const day = DAYS[(d.getDay() + 6) % 7]!;
  const h = d.getHours();
  return `${day}_${h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"}`;
}
