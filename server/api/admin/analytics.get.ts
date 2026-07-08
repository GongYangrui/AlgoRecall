import { format, startOfDay, subDays } from "date-fns";
import { sql } from "drizzle-orm";
import type { AdminDailyMetric } from "@shared/types/admin";
import { db } from "../../db";
import { analyticsEvents, appEvents, reviews } from "../../db/schema";
import { requireAdminSession } from "../../utils/admin-session";

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export default defineEventHandler(async (event): Promise<{ items: AdminDailyMetric[] }> => {
  await requireAdminSession(event);

  const today = startOfDay(new Date());
  const firstDay = startOfDay(subDays(today, 29));
  const fromIso = firstDay.toISOString();

  const days = Array.from({ length: 30 }, (_, index) => dateKey(subDays(today, 29 - index)));
  const metrics = new Map(days.map((date) => [date, { date, activeUsers: 0, startedItems: 0, reviews: 0, errors: 0 } satisfies AdminDailyMetric]));

  const analyticsRows = await db.execute(sql`
    SELECT
      substr(${analyticsEvents.timestamp}, 1, 10) AS date,
      count(DISTINCT ${analyticsEvents.userId}) AS active_users,
      count(*) FILTER (WHERE ${analyticsEvents.event} = 'study_item_started') AS started_items
    FROM ${analyticsEvents}
    WHERE ${analyticsEvents.timestamp} >= ${fromIso}
    GROUP BY 1
  `);

  const reviewRows = await db.execute(sql`
    SELECT substr(${reviews.reviewedAt}, 1, 10) AS date, count(*) AS reviews
    FROM ${reviews}
    WHERE ${reviews.reviewedAt} >= ${fromIso}
    GROUP BY 1
  `);

  const errorRows = await db.execute(sql`
    SELECT substr(${appEvents.timestamp}, 1, 10) AS date, count(*) AS errors
    FROM ${appEvents}
    WHERE ${appEvents.level} = 'error' AND ${appEvents.timestamp} >= ${fromIso}
    GROUP BY 1
  `);

  for (const row of analyticsRows.rows as Record<string, unknown>[]) {
    const metric = metrics.get(String(row.date));
    if (!metric) continue;
    metric.activeUsers = Number(row.active_users ?? 0);
    metric.startedItems = Number(row.started_items ?? 0);
  }

  for (const row of reviewRows.rows as Record<string, unknown>[]) {
    const metric = metrics.get(String(row.date));
    if (!metric) continue;
    metric.reviews = Number(row.reviews ?? 0);
  }

  for (const row of errorRows.rows as Record<string, unknown>[]) {
    const metric = metrics.get(String(row.date));
    if (!metric) continue;
    metric.errors = Number(row.errors ?? 0);
  }

  return { items: days.map((date) => metrics.get(date)!) };
});
