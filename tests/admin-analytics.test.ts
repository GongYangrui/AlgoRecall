import { describe, expect, it } from "vitest";
import { buildAdminDailyMetrics } from "../shared/admin-analytics";

describe("buildAdminDailyMetrics", () => {
  it("deduplicates active users and counts started items inside the requested window", () => {
    const metrics = buildAdminDailyMetrics({
      today: "2026-07-07",
      days: 3,
      analyticsEvents: [
        { date: "2026-07-05 09:00:00", userId: "u1", event: "app_opened" },
        { date: "2026-07-05 10:00:00", userId: "u1", event: "study_item_started" },
        { date: "2026-07-06 10:00:00", userId: "u2", event: "study_item_started" },
        { date: "2026-07-04 10:00:00", userId: "u3", event: "study_item_started" },
      ],
      reviewDates: ["2026-07-06 11:00:00", "2026-07-07 12:00:00"],
      errorDates: ["2026-07-07T01:00:00.000Z"],
    });

    expect(metrics).toEqual([
      { date: "2026-07-05", activeUsers: 1, startedItems: 1, reviews: 0, errors: 0 },
      { date: "2026-07-06", activeUsers: 1, startedItems: 1, reviews: 1, errors: 0 },
      { date: "2026-07-07", activeUsers: 0, startedItems: 0, reviews: 1, errors: 1 },
    ]);
  });
});
