import { eachDayOfInterval, format, subDays, subMonths } from "date-fns";
import { parseTags } from "./problems";
import { isDue } from "./schedule";
import type { Problem, Review, ReviewResult, ReviewTrendDay, StatsSummary, WeakTag } from "./types";

const EMPTY_RESULTS: Record<ReviewResult, number> = {
  easy: 0,
  hard: 0,
  solution: 0,
  mastered: 0,
};

export function buildStatsSummary(problems: Problem[], reviews: Pick<Review, "result" | "reviewedAt">[], today: string): StatsSummary {
  const byDifficulty: Record<string, number> = {};
  const byResult = { ...EMPTY_RESULTS };

  for (const problem of problems) {
    byDifficulty[problem.difficulty] = (byDifficulty[problem.difficulty] ?? 0) + 1;
  }

  for (const review of reviews) {
    if (review.result in byResult) {
      byResult[review.result] += 1;
    }
  }

  const mastered = problems.filter((problem) => problem.status === "mastered").length;
  const total = problems.length;

  return {
    total,
    due: problems.filter((problem) => isDue(problem, today)).length,
    mastered,
    learning: problems.filter((problem) => problem.status === "learning").length,
    reviewing: problems.filter((problem) => problem.status === "reviewing").length,
    newCount: problems.filter((problem) => problem.status === "new").length,
    masteryRate: total === 0 ? 0 : Math.round((mastered / total) * 100),
    byDifficulty,
    byResult,
    reviewHeatmap: buildReviewHeatmap(reviews, today),
    reviewTrend30d: buildReviewTrend(reviews, today),
    stageDistribution: buildStageDistribution(problems),
    weakTags: buildWeakTags(problems),
    attention: problems
      .filter((problem) => problem.status !== "mastered")
      .toSorted((a, b) => b.wrongCount - a.wrongCount || a.stage - b.stage)
      .slice(0, 6),
  };
}

function toDateKey(value: string | undefined) {
  return value?.slice(0, 10) || "";
}

function buildDayRange(start: string, end: string) {
  return eachDayOfInterval({
    start: new Date(`${start}T00:00:00`),
    end: new Date(`${end}T00:00:00`),
  }).map((day) => format(day, "yyyy-MM-dd"));
}

function buildReviewHeatmap(reviews: Pick<Review, "result" | "reviewedAt">[], today: string) {
  const start = format(subMonths(new Date(`${today}T00:00:00`), 6), "yyyy-MM-dd");
  const counts = new Map<string, number>();

  for (const review of reviews) {
    const date = toDateKey(review.reviewedAt);
    if (date >= start && date <= today) {
      counts.set(date, (counts.get(date) || 0) + 1);
    }
  }

  return buildDayRange(start, today).map((date) => ({
    date,
    count: counts.get(date) || 0,
  }));
}

function buildReviewTrend(reviews: Pick<Review, "result" | "reviewedAt">[], today: string) {
  const start = format(subDays(new Date(`${today}T00:00:00`), 29), "yyyy-MM-dd");
  const buckets = new Map<string, ReviewTrendDay>();

  for (const date of buildDayRange(start, today)) {
    buckets.set(date, {
      date,
      total: 0,
      easy: 0,
      hard: 0,
      solution: 0,
      mastered: 0,
    });
  }

  for (const review of reviews) {
    const date = toDateKey(review.reviewedAt);
    const bucket = buckets.get(date);
    if (!bucket) continue;

    bucket.total += 1;
    if (review.result in EMPTY_RESULTS) {
      bucket[review.result] += 1;
    }
  }

  return Array.from(buckets.values());
}

function buildStageDistribution(problems: Problem[]) {
  const counts = Array.from({ length: 7 }, (_, stage) => ({
    stage,
    count: 0,
  }));

  for (const problem of problems) {
    const stage = Math.max(0, Math.min(6, problem.stage));
    const bucket = counts[stage];
    if (bucket) bucket.count += 1;
  }

  return counts;
}

function buildWeakTags(problems: Problem[]): WeakTag[] {
  const tags = new Map<string, WeakTag>();

  for (const problem of problems) {
    if (problem.status === "mastered" || problem.wrongCount <= 0) continue;

    const problemTags = parseTags(problem.tagsCn).length > 0 ? parseTags(problem.tagsCn) : parseTags(problem.tags);

    for (const tag of problemTags) {
      const existing = tags.get(tag) || { tag, score: 0, count: 0 };
      existing.score += problem.wrongCount;
      existing.count += 1;
      tags.set(tag, existing);
    }
  }

  return Array.from(tags.values())
    .toSorted((a, b) => b.score - a.score || b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 8);
}
