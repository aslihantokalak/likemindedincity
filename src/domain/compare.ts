/** Code-point string comparison, independent of locale, for deterministic tie-breaking. */
export const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
