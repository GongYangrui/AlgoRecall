import { and, eq, sql } from "drizzle-orm";
import { createError } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { normalizeReviewNote } from "@shared/reviews";
import { calculateNextReview, getToday } from "@shared/schedule";
import { reviewResults, type ReviewResult } from "@shared/types";
import { db } from "../db";
import { problems, reviews } from "../db/schema";
import { trackAnalyticsEvent } from "../utils/analytics";
import { requireSession } from "../utils/auth-session";
import { setLogOperation } from "../utils/log-context";
import { markStudyListProgressReviewed } from "../utils/study-lists";
import { nowIso } from "../utils/time";

const reviewInput = z.object({
  problemId: z.string().min(1),
  result: z.enum(reviewResults),
  note: z.string().max(5000).optional().nullable(),
  studyListSlug: z.string().trim().min(1).max(200).optional().nullable(),
  titleSlug: z.string().trim().min(1).max(200).optional().nullable(),
});

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const parsed = reviewInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid review" });

  const { problemId, result, note, studyListSlug, titleSlug } = parsed.data;
  setLogOperation(event, "review.submit", { problemId, result, studyListSlug, titleSlug });
  const { review, updatedProblem } = await db.transaction(async (tx) => {
    const [problem] = await tx
      .select()
      .from(problems)
      .where(and(eq(problems.userId, session.user.id), eq(problems.id, problemId)))
      .limit(1)
      .for("update");

    if (!problem) throw createError({ statusCode: 404, statusMessage: "Problem not found" });

    const reviewedAt = nowIso();
    const next = calculateNextReview(
      problem.stage,
      problem.status,
      problem.wrongCount,
      result as ReviewResult,
      getToday(),
    );

    const [review] = await tx
      .insert(reviews)
      .values({
        id: uuidv4(),
        userId: session.user.id,
        problemId,
        reviewedAt,
        result,
        previousStage: problem.stage,
        nextStage: next.stage,
        nextReviewAt: next.nextReviewAt,
        note: normalizeReviewNote(note),
      })
      .returning();

    const [updatedProblem] = await tx
      .update(problems)
      .set({
        status: next.status,
        stage: next.stage,
        lastResult: next.lastResult,
        wrongCount: next.wrongCount,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: reviewedAt,
        reviewCount: sql`${problems.reviewCount} + 1`,
        updatedAt: reviewedAt,
      })
      .where(and(eq(problems.userId, session.user.id), eq(problems.id, problemId)))
      .returning();

    await markStudyListProgressReviewed(session.user.id, updatedProblem as typeof problem, { studyListSlug, titleSlug }, tx);
    return { review, updatedProblem };
  });
  await trackAnalyticsEvent({
    userId: session.user.id,
    event: "review_submitted",
    entityType: "problem",
    entityId: problemId,
    route: "/api/reviews",
    metadata: { result, studyListSlug, titleSlug },
  });

  return { review, problem: updatedProblem };
});
