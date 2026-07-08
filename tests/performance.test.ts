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
});
