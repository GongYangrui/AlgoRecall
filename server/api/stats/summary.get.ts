import { format, subMonths } from "date-fns";
import { and, desc, eq, gte } from "drizzle-orm";
import { buildStatsSummary } from "@shared/analytics";
import { getToday } from "@shared/schedule";
import type { Review } from "@shared/types";
import { db } from "../../db";
import { problems, reviews } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const today = getToday();
  const heatmapStart = format(subMonths(new Date(`${today}T00:00:00`), 6), "yyyy-MM-dd");
  const userProblems = await db
    .select()
    .from(problems)
    .where(eq(problems.userId, session.user.id))
    .orderBy(problems.createdAt);

  const recentReviews = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, session.user.id), gte(reviews.reviewedAt, heatmapStart)))
    .orderBy(desc(reviews.reviewedAt))
    .limit(5000);

  return buildStatsSummary(userProblems, recentReviews as Pick<Review, "result" | "reviewedAt">[], today);
});
