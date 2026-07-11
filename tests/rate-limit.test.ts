import { describe, expect, it, vi } from "vitest";

vi.mock("../server/utils/redis", () => ({
  getRedis: () => null,
}));

describe("rate limit fallback", () => {
  it("exports an async assertion helper", async () => {
    const { assertRateLimit } = await import("../server/utils/rate-limit");

    expect(assertRateLimit).toBeTypeOf("function");
  });
});
