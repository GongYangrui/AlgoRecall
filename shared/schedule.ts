import { format, startOfDay } from "date-fns";
import type { ReviewResult } from "./types";

export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60];

export function calculateNextReview(
  currentStage: number,
  _currentStatus: string,
  currentWrongCount: number,
  result: ReviewResult,
  today = getToday(),
) {
  let stage = currentStage;
  let status: "new" | "learning" | "reviewing" | "mastered" = "reviewing";
  let wrongCount = currentWrongCount;
  let nextReviewAt: string | null = today;

  switch (result) {
    case "easy":
      if (stage >= REVIEW_INTERVALS.length - 1) {
        status = "mastered";
        nextReviewAt = null;
      } else {
        nextReviewAt = addDaysToDateString(today, REVIEW_INTERVALS[stage] ?? 1);
        stage += 1;
      }
      break;
    case "hard":
      nextReviewAt = addDaysToDateString(today, Math.min(REVIEW_INTERVALS[stage] ?? 7, 7));
      break;
    case "solution":
      stage = Math.max(stage - 1, 0);
      wrongCount += 1;
      status = "learning";
      nextReviewAt = addDaysToDateString(today, 1);
      break;
    case "mastered":
      status = "mastered";
      nextReviewAt = null;
      break;
  }

  return { stage, status, nextReviewAt, lastResult: result, wrongCount };
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

export function getToday(): string {
  return format(startOfDay(new Date()), "yyyy-MM-dd");
}

export function isDue(problem: { nextReviewAt: string | null; status: string }, today = getToday()) {
  return problem.status !== "mastered" && (!problem.nextReviewAt || problem.nextReviewAt <= today);
}
