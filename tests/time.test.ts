import { describe, expect, it } from "vitest";
import { isDateKey, nowIso, todayDateKey } from "../server/utils/time";

describe("time helpers", () => {
  it("writes timestamps as ISO UTC strings", () => {
    expect(nowIso(new Date("2026-07-07T12:34:56.789Z"))).toBe("2026-07-07T12:34:56.789Z");
  });

  it("derives date keys from UTC timestamps", () => {
    expect(todayDateKey(new Date("2026-07-07T23:59:59.999Z"))).toBe("2026-07-07");
  });

  it("validates yyyy-mm-dd date keys", () => {
    expect(isDateKey("2026-07-07")).toBe(true);
    expect(isDateKey("2026-7-7")).toBe(false);
    expect(isDateKey("not-a-date")).toBe(false);
  });
});
