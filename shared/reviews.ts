export const REVIEW_NOTE_MAX_LENGTH = 500;

export function normalizeReviewNote(note: string | null | undefined) {
  const trimmed = note?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, REVIEW_NOTE_MAX_LENGTH);
}
