import { describe, expect, it } from "vitest";
import { REVIEW_NOTE_MAX_LENGTH, normalizeReviewNote } from "../shared/reviews";

describe("review helpers", () => {
  it("trims review notes and converts blanks to null", () => {
    expect(normalizeReviewNote("  忘了双指针收缩条件  ")).toBe("忘了双指针收缩条件");
    expect(normalizeReviewNote("   ")).toBeNull();
    expect(normalizeReviewNote(null)).toBeNull();
    expect(normalizeReviewNote(undefined)).toBeNull();
  });

  it("caps review notes at the storage limit", () => {
    expect(normalizeReviewNote("a".repeat(REVIEW_NOTE_MAX_LENGTH + 1))).toHaveLength(REVIEW_NOTE_MAX_LENGTH);
  });
});
