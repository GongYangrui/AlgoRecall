import { and, count, eq, getTableColumns, sql } from "drizzle-orm";
import { escapeLikePattern, normalizeProblemSearchQuery } from "@shared/problem-search";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { trackAnalyticsEvent } from "../../utils/analytics";
import { requireSession } from "../../utils/auth-session";
import { attachProblemSources } from "../../utils/study-lists";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const search = normalizeProblemSearchQuery(q);
  const difficulty = typeof query.difficulty === "string" ? query.difficulty : "";
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 50)));

  let conditions = eq(problems.userId, session.user.id);
  if (!search.tooShort) {
    const searchText = sql`lower(concat_ws(' ', ${problems.title}, ${problems.frontendId}, ${problems.tags}, ${problems.url}, ${problems.titleCn}, ${problems.urlEn}, ${problems.urlCn}))`;
    for (const word of search.words) {
      conditions = and(
        conditions,
        sql`${searchText} LIKE ${`%${escapeLikePattern(word)}%`} ESCAPE '\\'`,
      )!;
    }
  }
  if (difficulty) conditions = and(conditions, eq(problems.difficulty, difficulty))!;

  await trackAnalyticsEvent({
    userId: session.user.id,
    event: "problem_library_viewed",
    entityType: "page",
    entityId: "problems",
    route: "/api/problems",
    metadata: { q, difficulty, page, pageSize },
  });

  if (search.tooShort) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
    };
  }

  const rows = await db
    .select({
      ...getTableColumns(problems),
      totalCount: sql<number>`count(*) over()`,
    })
    .from(problems)
    .where(conditions)
    .orderBy(problems.nextReviewAt, problems.createdAt)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  let total = Number(rows[0]?.totalCount ?? 0);

  if (rows.length === 0 && page > 1) {
    const [totalRow] = await db.select({ count: count() }).from(problems).where(conditions);
    total = Number(totalRow?.count ?? 0);
  }

  const items = rows.map(({ totalCount: _totalCount, ...problem }) => problem);

  return {
    items: await attachProblemSources(session.user.id, items),
    total,
    page,
    pageSize,
  };
});
