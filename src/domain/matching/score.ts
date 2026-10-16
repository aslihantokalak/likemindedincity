import type { MatchWeights, Signal, User } from "../types";

export const SIGNALS: Signal[] = ["interests", "books", "profession", "schools"];

export const DEFAULT_WEIGHTS: MatchWeights = {
  interests: 0.35, books: 0.3, profession: 0.2, schools: 0.15, diversity: 0.2,
};

/** |A ∩ B| / |A ∪ B|; 0 when both are empty. */
export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  const union = new Set([...A, ...B]).size;
  if (union === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / union;
}

export function signalSimilarity(a: User, b: User): Record<Signal, number> {
  return {
    interests: jaccard(a.interests, b.interests),
    books: jaccard([...a.books, ...a.authors], [...b.books, ...b.authors]),
    profession: a.profession === b.profession ? 1 : a.industry === b.industry ? 0.5 : 0,
    schools: jaccard(a.schools, b.schools),
  };
}

/** Weighted similarity in [0, 1] plus each signal's weighted contribution (used for explanations). */
export function pairScore(a: User, b: User, w: MatchWeights): { score: number; contributions: Record<Signal, number> } {
  const sim = signalSimilarity(a, b);
  const contributions = Object.fromEntries(SIGNALS.map(s => [s, w[s] * sim[s]])) as Record<Signal, number>;
  const totalWeight = SIGNALS.reduce((sum, s) => sum + w[s], 0);
  const score = totalWeight === 0 ? 0 : SIGNALS.reduce((sum, s) => sum + contributions[s], 0) / totalWeight;
  return { score, contributions };
}
