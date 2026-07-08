import { describe, expect, it, vi } from "vitest";

vi.mock("../server/utils/logger", () => ({
  logPerformance: vi.fn(),
}));

describe("performance timer", () => {
  it("records stages and builds a valid Server-Timing header", async () => {
    const { createPerformanceTimer } = await import("../server/utils/performance");
    const timer = createPerformanceTimer();

    const result = await timer.measure("auth", "auth", () => "ok");
    await timer.measure("progress query", "db", async () => undefined);

    const snapshot = timer.snapshot();
    const header = timer.serverTimingHeader();

    expect(result).toBe("ok");
    expect(Number.isInteger(snapshot.totalMs)).toBe(true);
    expect(snapshot.totalMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.stages).toHaveLength(2);
    for (const stage of snapshot.stages) {
      expect(Number.isInteger(stage.durationMs)).toBe(true);
      expect(stage.durationMs).toBeGreaterThanOrEqual(0);
    }
    expect(header).toMatch(/^auth;dur=\d+, progress_query;dur=\d+, total;dur=\d+$/);
  });

  it("uses 100ms as the default slow request threshold", async () => {
    const { getApiSlowRequestThresholdMs } = await import("../server/utils/performance");

    expect(getApiSlowRequestThresholdMs({})).toBe(100);
    expect(getApiSlowRequestThresholdMs({ API_SLOW_REQUEST_THRESHOLD_MS: "250" })).toBe(250);
    expect(getApiSlowRequestThresholdMs({ API_SLOW_REQUEST_THRESHOLD_MS: "0" })).toBe(100);
    expect(getApiSlowRequestThresholdMs({ API_SLOW_REQUEST_THRESHOLD_MS: "abc" })).toBe(100);
  });

  it("logs only slow successful API requests or server errors", async () => {
    const { shouldLogApiRequestPerformance } = await import("../server/utils/performance");

    expect(shouldLogApiRequestPerformance({
      path: "/api/study-plan/today",
      statusCode: 200,
      durationMs: 99,
      thresholdMs: 100,
    })).toBe(false);
    expect(shouldLogApiRequestPerformance({
      path: "/api/study-plan/today",
      statusCode: 200,
      durationMs: 100,
      thresholdMs: 100,
    })).toBe(true);
    expect(shouldLogApiRequestPerformance({
      path: "/api/study-plan/today",
      statusCode: 500,
      durationMs: 10,
      thresholdMs: 100,
    })).toBe(true);
    expect(shouldLogApiRequestPerformance({
      path: "/api/study-plan/today",
      statusCode: 401,
      durationMs: 500,
      thresholdMs: 100,
    })).toBe(false);
    expect(shouldLogApiRequestPerformance({
      path: "/login",
      statusCode: 200,
      durationMs: 500,
      thresholdMs: 100,
    })).toBe(false);
  });
});
