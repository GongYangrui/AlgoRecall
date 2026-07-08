import { eachDayOfInterval, format, subDays, subMonths } from "date-fns";
import { parseTags } from "./problems";
import { isDue } from "./schedule";
import type { Problem, Review, ReviewResult, ReviewTrendDay, StatsAttentionProblem, StatsProblem, StatsReviewCount, StatsSummary, WeakTag } from "./types";

const EMPTY_RESULTS: Record<ReviewResult, number> = {
  easy: 0,
  hard: 0,
  solution: 0,
  mastered: 0,
};

export function buildStatsSummary(problems: Problem[], reviews: Pick<Review, "result" | "reviewedAt">[], today: string): StatsSummary {
  return buildStatsSummaryFromAggregates(problems, buildReviewCounts(reviews), today);
}

export function buildStatsSummaryFromAggregates(problems: StatsProblem[], reviewCounts: StatsReviewCount[], today: string): StatsSummary {
  const byDifficulty: Record<string, number> = {};
  const byResult = { ...EMPTY_RESULTS };

  for (const problem of problems) {
    byDifficulty[problem.difficulty] = (byDifficulty[problem.difficulty] ?? 0) + 1;
  }

  for (const reviewCount of reviewCounts) {
    if (reviewCount.result in byResult) {
      byResult[reviewCount.result as ReviewResult] += reviewCount.count;
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
    reviewHeatmap: buildReviewHeatmap(reviewCounts, today),
    reviewTrend30d: buildReviewTrend(reviewCounts, today),
    stageDistribution: buildStageDistribution(problems),
    weakTags: buildWeakTags(problems),
    attention: problems
      .filter((problem) => problem.status !== "mastered")
      .toSorted((a, b) => b.wrongCount - a.wrongCount || a.stage - b.stage)
      .slice(0, 6)
      .map(toAttentionProblem),
  };
}

function buildReviewCounts(reviews: Pick<Review, "result" | "reviewedAt">[]): StatsReviewCount[] {
  const counts = new Map<string, StatsReviewCount>();

  for (const review of reviews) {
    const date = toDateKey(review.reviewedAt);
    const key = `${date}:${review.result}`;
    const existing = counts.get(key) || { date, result: review.result, count: 0 };
    existing.count += 1;
    counts.set(key, existing);
  }

  return Array.from(counts.values());
}

function toAttentionProblem(problem: StatsProblem): StatsAttentionProblem {
  return {
    id: problem.id,
    title: problem.title,
    titleCn: problem.titleCn,
    titleSlug: problem.titleSlug,
    frontendId: problem.frontendId,
    difficulty: problem.difficulty,
    tagsCn: problem.tagsCn,
    tags: problem.tags,
    status: problem.status,
    stage: problem.stage,
    wrongCount: problem.wrongCount,
    nextReviewAt: problem.nextReviewAt,
    reviewCount: problem.reviewCount,
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

function buildReviewHeatmap(reviewCounts: StatsReviewCount[], today: string) {
  const start = format(subMonths(new Date(`${today}T00:00:00`), 6), "yyyy-MM-dd");
  const counts = new Map<string, number>();

  for (const reviewCount of reviewCounts) {
    const date = reviewCount.date;
    if (date >= start && date <= today) {
      counts.set(date, (counts.get(date) || 0) + reviewCount.count);
    }
  }

  return buildDayRange(start, today).map((date) => ({
    date,
    count: counts.get(date) || 0,
  }));
}

function buildReviewTrend(reviewCounts: StatsReviewCount[], today: string) {
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

  for (const reviewCount of reviewCounts) {
    const bucket = buckets.get(reviewCount.date);
    if (!bucket) continue;

    bucket.total += reviewCount.count;
    if (reviewCount.result in EMPTY_RESULTS) {
      bucket[reviewCount.result as ReviewResult] += reviewCount.count;
    }
  }

  return Array.from(buckets.values());
}

function buildStageDistribution(problems: Pick<StatsProblem, "stage">[]) {
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

function buildWeakTags(problems: Pick<StatsProblem, "status" | "wrongCount" | "tags" | "tagsCn">[]): WeakTag[] {
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
