const DAYS: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** "thu_evening" → "Thursday evening" */
export function formatSlot(slot: string): string {
  const [day, part] = slot.split("_");
  return `${DAYS[day] ?? day} ${part ?? ""}`.trim();
}
