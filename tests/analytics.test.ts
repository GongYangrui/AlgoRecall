import { describe, expect, it } from "vitest";
import { buildStatsSummary } from "../shared/analytics";
import type { Problem, Review } from "../shared/types";

function problem(overrides: Partial<Problem>): Problem {
  return {
    id: "p",
    userId: "u",
    title: "Two Sum",
    titleCn: "两数之和",
    frontendId: "1",
    tagsCn: null,
    url: "https://leetcode.cn/problems/two-sum",
    urlEn: null,
    urlCn: null,
    platform: "leetcode",
    difficulty: "easy",
    tags: null,
    status: "new",
    stage: 0,
    lastResult: null,
    wrongCount: 0,
    nextReviewAt: "2026-07-01",
    lastReviewedAt: null,
    reviewCount: 0,
    createdAt: "2026-07-01",
    updatedAt: "2026-07-01",
    ...overrides,
  };
}

describe("buildStatsSummary", () => {
  it("counts due, mastered, difficulty, results, and attention items", () => {
    const summary = buildStatsSummary(
      [
        problem({ id: "a", status: "mastered", nextReviewAt: null }),
        problem({ id: "b", difficulty: "hard", wrongCount: 3 }),
        problem({ id: "c", status: "learning", wrongCount: 1 }),
      ],
      [{ result: "easy" }, { result: "solution" }] as Pick<Review, "result">[],
      "2026-07-01",
    );

    expect(summary.total).toBe(3);
    expect(summary.due).toBe(2);
    expect(summary.mastered).toBe(1);
    expect(summary.masteryRate).toBe(33);
    expect(summary.byDifficulty.hard).toBe(1);
    expect(summary.byResult.solution).toBe(1);
    expect(summary.attention[0]?.id).toBe("b");
  });
});
