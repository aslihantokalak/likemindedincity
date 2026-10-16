import type { BacklogItem } from "./types";

type RiceInputs = Pick<BacklogItem, "reach" | "impact" | "confidence" | "effort">;

/** RICE = reach × impact × confidence / effort. Effort is floored at 0.5 person-weeks. */
export function riceScore({ reach, impact, confidence, effort }: RiceInputs): number {
  return (reach * impact * confidence) / Math.max(effort, 0.5);
}

/** Highest score first; equal scores ordered by id. Returns a new array. */
export function rankBacklog(items: BacklogItem[]): BacklogItem[] {
  return [...items].sort((a, b) => riceScore(b) - riceScore(a) || a.id.localeCompare(b.id));
}
