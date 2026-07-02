import { and, desc, eq } from "drizzle-orm";
import { createError } from "h3";
import { db } from "../../db";
import { problems, reviews } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing problem id" });

  const [problem] = await db
    .select()
    .from(problems)
    .where(and(eq(problems.userId, session.user.id), eq(problems.id, id)))
    .limit(1);

  if (!problem) throw createError({ statusCode: 404, statusMessage: "Problem not found" });

  const history = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, session.user.id), eq(reviews.problemId, id)))
    .orderBy(desc(reviews.reviewedAt))
    .limit(50);

  return { problem, history };
});
