import { format, subMonths } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { buildStatsSummaryFromAggregates } from "@shared/analytics";
import { getToday } from "@shared/schedule";
import type { StatsReviewCount } from "@shared/types";
import { db } from "../../db";
import { problems, reviews } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const today = getToday();
  const heatmapStart = format(subMonths(new Date(`${today}T00:00:00`), 6), "yyyy-MM-dd");
  const userProblems = await db
    .select({
      id: problems.id,
      title: problems.title,
      titleCn: problems.titleCn,
      titleSlug: problems.titleSlug,
      frontendId: problems.frontendId,
      difficulty: problems.difficulty,
      tagsCn: problems.tagsCn,
      tags: problems.tags,
      status: problems.status,
      stage: problems.stage,
      wrongCount: problems.wrongCount,
      nextReviewAt: problems.nextReviewAt,
      reviewCount: problems.reviewCount,
    })
    .from(problems)
    .where(eq(problems.userId, session.user.id))
    .orderBy(problems.createdAt);

  const reviewRows = await db.execute(sql`
    SELECT
      to_char(${reviews.reviewedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      ${reviews.result} AS result,
      count(*)::int AS count
    FROM ${reviews}
    WHERE ${reviews.userId} = ${session.user.id} AND ${reviews.reviewedAt} >= ${`${heatmapStart}T00:00:00.000Z`}
    GROUP BY 1, 2
  `);
  const reviewCounts = (reviewRows.rows as Record<string, unknown>[]).map((row) => ({
    date: String(row.date || ""),
    result: String(row.result || ""),
    count: Number(row.count || 0),
  })) satisfies StatsReviewCount[];

  return buildStatsSummaryFromAggregates(userProblems, reviewCounts, today);
});
