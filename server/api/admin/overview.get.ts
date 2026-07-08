import { startOfDay, subDays } from "date-fns";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { analyticsEvents, appEvents, problems, reviews } from "../../db/schema";
import { user } from "../../db/auth-schema";
import { requireAdminSession } from "../../utils/admin-session";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const todayStart = startOfDay(new Date()).toISOString();
  const sevenDaysStart = startOfDay(subDays(new Date(), 6)).toISOString();

  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(user);
  const [problemsCount] = await db.select({ count: sql<number>`count(*)` }).from(problems);
  const [reviewsCount] = await db.select({ count: sql<number>`count(*)` }).from(reviews);

  const [todayActiveUsers] = await db
    .select({ count: sql<number>`count(DISTINCT ${analyticsEvents.userId})` })
    .from(analyticsEvents)
    .where(sql`${analyticsEvents.timestamp} >= ${todayStart}`);

  const [activeUsers7d] = await db
    .select({ count: sql<number>`count(DISTINCT ${analyticsEvents.userId})` })
    .from(analyticsEvents)
    .where(sql`${analyticsEvents.timestamp} >= ${sevenDaysStart}`);

  const [todayStartedItems] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(sql`${analyticsEvents.event} = 'study_item_started' AND ${analyticsEvents.timestamp} >= ${todayStart}`);

  const [todayReviews] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviews)
    .where(sql`${reviews.reviewedAt} >= ${todayStart}`);

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
    userCount: Number(usersCount?.count ?? 0),
    problemCount: Number(problemsCount?.count ?? 0),
    reviewCount: Number(reviewsCount?.count ?? 0),
    todayActiveUsers: Number(todayActiveUsers?.count ?? 0),
    activeUsers7d: Number(activeUsers7d?.count ?? 0),
    todayStartedItems: Number(todayStartedItems?.count ?? 0),
    todayReviews: Number(todayReviews?.count ?? 0),
    errorCount24h: Number(errorCount24h?.count ?? 0),
    dbConnected,
    appUptime: Math.floor(process.uptime()),
  };
});
