export const PROBLEM_SEARCH_MIN_CHARS = 2;

export function normalizeProblemSearchQuery(value: string) {
  const raw = value.trim();
  const words = raw
    .replace(/[.\s]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
  const tooShort = raw.length > 0 && (words.length === 0 || words.some((word) => Array.from(word).length < PROBLEM_SEARCH_MIN_CHARS));

  return {
    raw,
    words,
    tooShort,
  };
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
