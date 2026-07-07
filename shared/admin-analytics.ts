import { format, startOfDay, subDays } from "date-fns";
import type { AdminDailyMetric } from "./types/admin";

export interface AdminAnalyticsEventInput {
  date: string;
  userId: string;
  event: string;
}

function toDateKey(value: string) {
  return value.slice(0, 10);
}

export function buildAdminDailyMetrics(input: {
  today: string;
  days?: number;
  analyticsEvents: AdminAnalyticsEventInput[];
  reviewDates: string[];
  errorDates: string[];
}): AdminDailyMetric[] {
  const dayCount = input.days ?? 30;
  const today = startOfDay(new Date(`${input.today}T00:00:00`));
  const dates = Array.from({ length: dayCount }, (_, index) => format(subDays(today, dayCount - 1 - index), "yyyy-MM-dd"));
  const dateSet = new Set(dates);
  const metrics = new Map(dates.map((date) => [date, { date, activeUsers: 0, startedItems: 0, reviews: 0, errors: 0 } satisfies AdminDailyMetric]));
  const activeUsersByDate = new Map<string, Set<string>>();

  for (const event of input.analyticsEvents) {
    const date = toDateKey(event.date);
    if (!dateSet.has(date)) continue;

    if (!activeUsersByDate.has(date)) activeUsersByDate.set(date, new Set());
    activeUsersByDate.get(date)!.add(event.userId);

    if (event.event === "study_item_started") {
      metrics.get(date)!.startedItems += 1;
    }
  }

  for (const [date, users] of activeUsersByDate) {
    metrics.get(date)!.activeUsers = users.size;
  }

  for (const value of input.reviewDates) {
    const date = toDateKey(value);
    if (dateSet.has(date)) metrics.get(date)!.reviews += 1;
  }

  for (const value of input.errorDates) {
    const date = toDateKey(value);
    if (dateSet.has(date)) metrics.get(date)!.errors += 1;
  }

  return dates.map((date) => metrics.get(date)!);
}
