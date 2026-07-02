import { format } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { createError } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { normalizeReviewNote } from "@shared/reviews";
import { calculateNextReview, getToday } from "@shared/schedule";
import type { ReviewResult } from "@shared/types";
import { db } from "../db";
import { problems, reviews } from "../db/schema";
import { requireSession } from "../utils/auth-session";

const reviewInput = z.object({
  problemId: z.string().min(1),
  result: z.enum(["easy", "hard", "solution", "mastered"]),
  note: z.string().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const parsed = reviewInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid review" });

  const { problemId, result, note } = parsed.data;
  const [problem] = await db
    .select()
    .from(problems)
    .where(and(eq(problems.userId, session.user.id), eq(problems.id, problemId)))
    .limit(1);

  if (!problem) throw createError({ statusCode: 404, statusMessage: "Problem not found" });

  const reviewedAt = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const next = calculateNextReview(
    problem.stage,
    problem.status,
    problem.wrongCount,
    result as ReviewResult,
    getToday(),
  );

  const [review] = await db
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

  const [updatedProblem] = await db
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

  return { review, problem: updatedProblem };
});
