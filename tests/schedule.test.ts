import { describe, expect, it } from "vitest";
import { calculateNextReview } from "../shared/schedule";

describe("calculateNextReview", () => {
  it("advances the stage and schedules the next interval after an easy review", () => {
    expect(calculateNextReview(2, "reviewing", 0, "easy", "2026-07-01")).toEqual({
      stage: 3,
      status: "reviewing",
      nextReviewAt: "2026-07-05",
      lastResult: "easy",
      wrongCount: 0,
    });
  });

  it("moves backward and increments wrong count after reading the solution", () => {
    expect(calculateNextReview(3, "reviewing", 1, "solution", "2026-07-01")).toEqual({
      stage: 2,
      status: "learning",
      nextReviewAt: "2026-07-02",
      lastResult: "solution",
      wrongCount: 2,
    });
  });

  it("marks mastered items as unscheduled", () => {
    expect(calculateNextReview(4, "reviewing", 0, "mastered", "2026-07-01")).toMatchObject({
      status: "mastered",
      nextReviewAt: null,
    });
  });
});
