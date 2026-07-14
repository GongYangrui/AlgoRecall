import { createError, getHeader } from "h3";
import { z } from "zod";
import { REVIEW_NOTE_MAX_LENGTH } from "@shared/reviews";
import { reviewResults } from "@shared/types";
import { trackAnalyticsEvent } from "../utils/analytics";
import { requireSession } from "../utils/auth-session";
import { setLogOperation } from "../utils/log-context";
import { recordReview } from "../utils/review-service";

const reviewInput = z.object({
  problemId: z.string().min(1),
  result: z.enum(reviewResults),
  note: z.string().max(REVIEW_NOTE_MAX_LENGTH).optional().nullable(),
  studyListSlug: z.string().trim().min(1).max(200).optional().nullable(),
  titleSlug: z.string().trim().min(1).max(200).optional().nullable(),
});

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const parsed = reviewInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid review" });

  const parsedKey = z.string().uuid().safeParse(getHeader(event, "idempotency-key")?.trim());
  if (!parsedKey.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid Idempotency-Key header is required",
      data: { code: "INVALID_IDEMPOTENCY_KEY" },
    });
  }

  const { problemId, result, note, studyListSlug, titleSlug } = parsed.data;
  setLogOperation(event, "review.submit", { problemId, result, studyListSlug, titleSlug, idempotent: true });
  const { review, updatedProblem } = await recordReview({
    userId: session.user.id,
    problemId,
    result,
    note,
    idempotencyKey: parsedKey.data,
    studyListSlug,
    titleSlug,
  });

  void trackAnalyticsEvent({
    userId: session.user.id,
    event: "review_submitted",
    entityType: "problem",
    entityId: updatedProblem.id,
    route: "/api/reviews",
    metadata: { result, studyListSlug, titleSlug },
  });
  return { review, problem: updatedProblem };
});
