import { and, eq, sql } from "drizzle-orm";
import { createError } from "h3";
import { v4 as uuidv4 } from "uuid";
import { normalizeReviewNote } from "@shared/reviews";
import { calculateNextReview, getToday } from "@shared/schedule";
import type { ReviewResult } from "@shared/types";
import { db } from "../db";
import { problems, reviews } from "../db/schema";
import { isPostgresUniqueViolation } from "./db-errors";
import { markStudyListProgressReviewed } from "./study-lists";
import { nowIso } from "./time";

type ReviewTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RecordReviewInput = {
  userId: string;
  problemId: string;
  result: ReviewResult;
  note?: string | null;
  idempotencyKey: string;
  studyListSlug?: string | null;
  titleSlug?: string | null;
};

export async function findIdempotentReview(userId: string, idempotencyKey: string, client: ReviewTransaction | typeof db = db) {
  const [existingReview] = await client
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.idempotencyKey, idempotencyKey)))
    .limit(1);
  if (!existingReview) return null;

  const [currentProblem] = await client
    .select()
    .from(problems)
    .where(and(eq(problems.userId, userId), eq(problems.id, existingReview.problemId)))
    .limit(1);
  if (!currentProblem) throw createError({ statusCode: 404, statusMessage: "Problem not found" });
  return { review: existingReview, updatedProblem: currentProblem, idempotent: true as const };
}

export async function recordReviewInTransaction(client: ReviewTransaction, input: RecordReviewInput) {
  const existing = await findIdempotentReview(input.userId, input.idempotencyKey, client);
  if (existing) return existing;

  const [problem] = await client
    .select()
    .from(problems)
    .where(and(eq(problems.userId, input.userId), eq(problems.id, input.problemId)))
    .limit(1)
    .for("update");
  if (!problem) throw createError({ statusCode: 404, statusMessage: "Problem not found" });

  const reviewedAt = nowIso();
  const next = calculateNextReview(problem.stage, problem.status, problem.wrongCount, input.result, getToday());
  const [review] = await client
    .insert(reviews)
    .values({
      id: uuidv4(),
      userId: input.userId,
      problemId: input.problemId,
      reviewedAt,
      result: input.result,
      previousStage: problem.stage,
      nextStage: next.stage,
      nextReviewAt: next.nextReviewAt,
      note: normalizeReviewNote(input.note),
      idempotencyKey: input.idempotencyKey,
    })
    .returning();
  if (!review) throw createError({ statusCode: 500, statusMessage: "Review could not be created" });

  const [updatedProblem] = await client
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
    .where(and(eq(problems.userId, input.userId), eq(problems.id, input.problemId)))
    .returning();
  if (!updatedProblem) throw createError({ statusCode: 409, statusMessage: "Problem could not be updated" });

  await markStudyListProgressReviewed(
    input.userId,
    updatedProblem,
    { studyListSlug: input.studyListSlug, titleSlug: input.titleSlug },
    client,
  );
  return { review, updatedProblem, idempotent: false as const };
}

export async function recordReview(input: RecordReviewInput) {
  try {
    return await db.transaction((tx) => recordReviewInTransaction(tx, input));
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) throw error;
    const existing = await findIdempotentReview(input.userId, input.idempotencyKey);
    if (!existing) throw error;
    return existing;
  }
}
