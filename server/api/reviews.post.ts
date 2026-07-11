import { and, eq, sql } from "drizzle-orm";
import { createError, getHeader } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { normalizeReviewNote } from "@shared/reviews";
import { calculateNextReview, getToday } from "@shared/schedule";
import { reviewResults, type ReviewResult } from "@shared/types";
import { db } from "../db";
import { problems, reviews } from "../db/schema";
import { trackAnalyticsEvent } from "../utils/analytics";
import { requireSession } from "../utils/auth-session";
import { isPostgresUniqueViolation } from "../utils/db-errors";
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

function getIdempotencyKey(event: Parameters<typeof getHeader>[0]) {
  const headerKey = getHeader(event, "idempotency-key")?.trim();
  const parsed = z.string().uuid().safeParse(headerKey);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid Idempotency-Key header is required",
      data: { code: "INVALID_IDEMPOTENCY_KEY" },
    });
  }
  return parsed.data;
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const parsed = reviewInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid review" });

  const { problemId, result, note, studyListSlug, titleSlug } = parsed.data;
  const idempotencyKey = getIdempotencyKey(event);
  setLogOperation(event, "review.submit", { problemId, result, studyListSlug, titleSlug, idempotent: Boolean(idempotencyKey) });
  const { review, updatedProblem } = await db.transaction(async (tx) => {
    const [problem] = await tx
      .select()
      .from(problems)
      .where(and(eq(problems.userId, session.user.id), eq(problems.id, problemId)))
      .limit(1)
      .for("update");

    if (!problem) throw createError({ statusCode: 404, statusMessage: "Problem not found" });

    const [existingReview] = await tx
        .select()
        .from(reviews)
        .where(and(eq(reviews.userId, session.user.id), eq(reviews.idempotencyKey, idempotencyKey)))
        .limit(1);

    if (existingReview) {
        const [currentProblem] = await tx
          .select()
          .from(problems)
          .where(and(eq(problems.userId, session.user.id), eq(problems.id, existingReview.problemId)))
          .limit(1);
        if (!currentProblem) throw createError({ statusCode: 404, statusMessage: "Problem not found" });
        return { review: existingReview, updatedProblem: currentProblem };
    }

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
        idempotencyKey,
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
        version: sql`${problems.version} + 1`,
        updatedAt: reviewedAt,
      })
      .where(and(eq(problems.userId, session.user.id), eq(problems.id, problemId)))
      .returning();

    await markStudyListProgressReviewed(session.user.id, updatedProblem as typeof problem, { studyListSlug, titleSlug }, tx);
    return { review, updatedProblem };
  }).catch(async (error) => {
    if (!isPostgresUniqueViolation(error)) throw error;

    const [existingReview] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, session.user.id), eq(reviews.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (!existingReview) throw error;

    const [currentProblem] = await db
      .select()
      .from(problems)
      .where(and(eq(problems.userId, session.user.id), eq(problems.id, existingReview.problemId)))
      .limit(1);
    if (!currentProblem) throw error;
    return { review: existingReview, updatedProblem: currentProblem };
  });
  void trackAnalyticsEvent({
    userId: session.user.id,
    event: "review_submitted",
    entityType: "problem",
    entityId: problemId,
    route: "/api/reviews",
    metadata: { result, studyListSlug, titleSlug },
  });

  return { review, problem: updatedProblem };
});
