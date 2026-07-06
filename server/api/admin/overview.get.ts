import { sql } from "drizzle-orm";
import { db } from "../../db";
import { appEvents, problems, reviews } from "../../db/schema";
import { user } from "../../db/auth-schema";
import { requireAdminSession } from "../../utils/admin-session";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(user);
  const [problemsCount] = await db.select({ count: sql<number>`count(*)` }).from(problems);
  const [reviewsCount] = await db.select({ count: sql<number>`count(*)` }).from(reviews);

  const [activeUsersCount] = await db
    .select({ count: sql<number>`count(DISTINCT ${reviews.userId})` })
    .from(reviews)
    .where(sql`${reviews.reviewedAt} > (now() - interval '24 hours')`);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [errorCount24h] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appEvents)
    .where(
      sql`${appEvents.level} = 'error' AND ${appEvents.timestamp} > ${oneDayAgo}`,
    );

  let dbConnected = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  return {
    userCount: usersCount?.count ?? 0,
    problemCount: problemsCount?.count ?? 0,
    reviewCount: reviewsCount?.count ?? 0,
    activeUsers24h: activeUsersCount?.count ?? 0,
    errorCount24h: errorCount24h?.count ?? 0,
    dbConnected,
    appUptime: Math.floor(process.uptime()),
  };
});
