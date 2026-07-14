import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { ExtensionReviewResponse } from "@shared/extension";
import { REVIEW_NOTE_MAX_LENGTH } from "@shared/reviews";
import { getToday } from "@shared/schedule";
import { reviewResults } from "@shared/types";
import { db } from "../../db";
import { leetcodeQuestions, problems } from "../../db/schema";
import { trackAnalyticsEvent } from "../../utils/analytics";
import { isPostgresUniqueViolation } from "../../utils/db-errors";
import { requireExtensionToken } from "../../utils/extension-auth";
import { setLogOperation } from "../../utils/log-context";
import { assertRateLimit } from "../../utils/rate-limit";
import { findIdempotentReview, recordReviewInTransaction } from "../../utils/review-service";
import { nowIso } from "../../utils/time";

const inputSchema = z.object({
  titleSlug: z.string().trim().min(1).max(200),
  result: z.enum(reviewResults),
  note: z.string().max(REVIEW_NOTE_MAX_LENGTH).optional().nullable(),
  idempotencyKey: z.string().uuid(),
});

export default defineEventHandler(async (event): Promise<ExtensionReviewResponse> => {
  const connection = await requireExtensionToken(event);
  await assertRateLimit(event, { bucket: "extension.review", key: connection.id, limit: 30, windowMs: 60_000 });
  const parsed = inputSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid review", data: { code: "INVALID_REVIEW" } });
  const input = parsed.data;

  const transact = () => db.transaction(async (tx) => {
    const idempotent = await findIdempotentReview(connection.userId, input.idempotencyKey, tx);
    if (idempotent) return { ...idempotent, createdProblem: false };

    const [question] = await tx.select().from(leetcodeQuestions).where(eq(leetcodeQuestions.titleSlug, input.titleSlug)).limit(1);
    if (!question) {
      throw createError({ statusCode: 404, statusMessage: "Question is not indexed", data: { code: "QUESTION_NOT_INDEXED" } });
    }
    let [problem] = await tx
      .select()
      .from(problems)
      .where(and(eq(problems.userId, connection.userId), eq(problems.titleSlug, input.titleSlug)))
      .limit(1);
    let createdProblem = false;
    if (!problem) {
      const now = nowIso();
      [problem] = await tx.insert(problems).values({
        id: uuidv4(),
        userId: connection.userId,
        title: question.title,
        titleCn: question.titleCn,
        titleSlug: question.titleSlug,
        frontendId: question.questionFrontendId,
        url: question.urlCn,
        urlEn: question.urlEn,
        urlCn: question.urlCn,
        platform: "leetcode",
        difficulty: question.difficulty,
        tags: question.tags,
        tagsCn: question.tagsCn,
        status: "new",
        stage: 0,
        nextReviewAt: getToday(),
        createdAt: now,
        updatedAt: now,
      }).returning();
      if (!problem) throw createError({ statusCode: 500, statusMessage: "Problem could not be created" });
      createdProblem = true;
    }
    const recorded = await recordReviewInTransaction(tx, {
      userId: connection.userId,
      problemId: problem.id,
      result: input.result,
      note: input.note,
      idempotencyKey: input.idempotencyKey,
      titleSlug: input.titleSlug,
    });
    return { ...recorded, createdProblem };
  });

  let recorded;
  try {
    recorded = await transact();
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) throw error;
    const existing = await findIdempotentReview(connection.userId, input.idempotencyKey);
    recorded = existing ? { ...existing, createdProblem: false } : await transact();
  }

  setLogOperation(event, "extension.review.submit", {
    connectionId: connection.id,
    titleSlug: input.titleSlug,
    result: input.result,
    createdProblem: recorded.createdProblem,
  });
  void trackAnalyticsEvent({
    userId: connection.userId,
    event: "extension_review_submitted",
    entityType: "problem",
    entityId: recorded.updatedProblem.id,
    route: "/api/extension/reviews",
    metadata: { result: input.result, titleSlug: input.titleSlug },
  });
  return {
    review: recorded.review as ExtensionReviewResponse["review"],
    problem: recorded.updatedProblem as ExtensionReviewResponse["problem"],
    createdProblem: recorded.createdProblem,
  };
});
