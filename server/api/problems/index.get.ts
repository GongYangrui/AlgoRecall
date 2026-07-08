import { and, count, eq, like, sql } from "drizzle-orm";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { trackAnalyticsEvent } from "../../utils/analytics";
import { requireSession } from "../../utils/auth-session";
import { attachProblemSources } from "../../utils/study-lists";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const difficulty = typeof query.difficulty === "string" ? query.difficulty : "";
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 50)));

  let conditions = eq(problems.userId, session.user.id);
  if (q) {
    const words = q.replace(/[.\s]+/g, " ").trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      conditions = and(
        conditions,
        sql`(${like(problems.title, `%${word}%`)} OR ${like(problems.frontendId, `%${word}%`)} OR ${like(problems.tags, `%${word}%`)} OR ${like(problems.url, `%${word}%`)} OR ${like(problems.titleCn, `%${word}%`)} OR ${like(problems.urlEn, `%${word}%`)} OR ${like(problems.urlCn, `%${word}%`)})`,
      )!;
    }
  }
  if (difficulty) conditions = and(conditions, eq(problems.difficulty, difficulty))!;

  const [totalRow] = await db.select({ count: count() }).from(problems).where(conditions);
  const items = await db
    .select()
    .from(problems)
    .where(conditions)
    .orderBy(problems.nextReviewAt, problems.createdAt)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  await trackAnalyticsEvent({
    userId: session.user.id,
    event: "problem_library_viewed",
    entityType: "page",
    entityId: "problems",
    route: "/api/problems",
    metadata: { q, difficulty, page, pageSize },
  });

  return {
    items: await attachProblemSources(session.user.id, items),
    total: totalRow?.count ?? 0,
    page,
    pageSize,
  };
});
