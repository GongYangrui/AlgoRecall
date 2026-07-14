import { and, desc, eq } from "drizzle-orm";
import { createError, getRouterParam } from "h3";
import { format } from "date-fns";
import type { ExtensionProblemResponse } from "@shared/extension";
import { getToday } from "@shared/schedule";
import { db } from "../../../db";
import { problems, reviews } from "../../../db/schema";
import { requireExtensionToken } from "../../../utils/extension-auth";
import { getLeetcodeQuestionBySlug } from "../../../utils/leetcode-index";

export default defineEventHandler(async (event): Promise<ExtensionProblemResponse> => {
  const connection = await requireExtensionToken(event);
  const titleSlug = getRouterParam(event, "titleSlug")?.trim() || "";
  if (!titleSlug) throw createError({ statusCode: 400, statusMessage: "Problem slug is required" });

  const question = await getLeetcodeQuestionBySlug(titleSlug);
  if (!question) {
    throw createError({ statusCode: 404, statusMessage: "Question is not indexed", data: { code: "QUESTION_NOT_INDEXED" } });
  }

  const [problem] = await db
    .select()
    .from(problems)
    .where(and(eq(problems.userId, connection.userId), eq(problems.titleSlug, titleSlug)))
    .limit(1);
  const [latestReview] = problem
    ? await db.select().from(reviews).where(and(eq(reviews.userId, connection.userId), eq(reviews.problemId, problem.id))).orderBy(desc(reviews.reviewedAt)).limit(1)
    : [];
  const reviewedToday = Boolean(latestReview && format(new Date(latestReview.reviewedAt), "yyyy-MM-dd") === getToday());
  return {
    question: {
      titleSlug: question.titleSlug,
      questionFrontendId: question.questionFrontendId,
      title: question.title,
      titleCn: question.titleCn,
      difficulty: question.difficulty,
    },
    problem: problem || null,
    reviewedToday,
    latestReview: (latestReview || null) as ExtensionProblemResponse["latestReview"],
  };
});
