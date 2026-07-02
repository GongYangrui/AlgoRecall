import assert from "node:assert/strict";

process.env.TZ = "Asia/Shanghai";

const { addDaysToDateString, calculateNextReview } = await import("../src/lib/schedule.ts");

assert.equal(addDaysToDateString("2026-06-27", 1), "2026-06-28");

assert.deepEqual(
  calculateNextReview(0, "new", 0, "easy", "2026-06-27"),
  {
    stage: 1,
    status: "reviewing",
    nextReviewAt: "2026-06-28",
    lastResult: "easy",
    wrongCount: 0,
  },
);

assert.deepEqual(
  calculateNextReview(2, "reviewing", 1, "solution", "2026-06-27"),
  {
    stage: 1,
    status: "learning",
    nextReviewAt: "2026-06-28",
    lastResult: "solution",
    wrongCount: 2,
  },
);

assert.deepEqual(
  calculateNextReview(3, "reviewing", 0, "mastered", "2026-06-27"),
  {
    stage: 3,
    status: "mastered",
    nextReviewAt: null,
    lastResult: "mastered",
    wrongCount: 0,
  },
);

console.log("schedule tests passed");
