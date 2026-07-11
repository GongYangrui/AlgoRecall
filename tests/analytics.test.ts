import { describe, expect, it } from "vitest";
import { buildStatsSummary, buildStatsSummaryFromAggregates } from "../shared/analytics";
import type { Problem, Review } from "../shared/types";

function problem(overrides: Partial<Problem>): Problem {
  return {
    id: "p",
    userId: "u",
    title: "Two Sum",
    titleCn: "两数之和",
    titleSlug: "two-sum",
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
    version: 1,
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
        problem({ id: "d", nextReviewAt: null }),
      ],
      [{ result: "easy" }, { result: "solution" }] as Pick<Review, "result" | "reviewedAt">[],
      "2026-07-01",
    );

    expect(summary.total).toBe(4);
    expect(summary.due).toBe(3);
    expect(summary.mastered).toBe(1);
    expect(summary.masteryRate).toBe(25);
    expect(summary.byDifficulty.hard).toBe(1);
    expect(summary.byResult.solution).toBe(1);
    expect(summary.attention[0]?.id).toBe("b");
  });

  it("builds review heatmap and trend from aggregated review counts", () => {
    const summary = buildStatsSummaryFromAggregates(
      [problem({ id: "a" })],
      [
        { date: "2026-07-08", result: "easy", count: 3 },
        { date: "2026-06-30", result: "solution", count: 2 },
        { date: "2026-06-01", result: "hard", count: 1 },
      ],
      "2026-07-08",
    );

    expect(summary.byResult.easy).toBe(3);
    expect(summary.byResult.solution).toBe(2);
    expect(summary.reviewHeatmap.find((day) => day.date === "2026-07-08")?.count).toBe(3);
    expect(summary.reviewTrend30d.find((day) => day.date === "2026-06-30")?.solution).toBe(2);
    expect(summary.reviewTrend30d.find((day) => day.date === "2026-07-08")?.total).toBe(3);
  });
});
