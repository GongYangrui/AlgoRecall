import { describe, expect, it } from "vitest";
import { isLogSource } from "../shared/logging";
import { isAdminLogLevel, normalizeAdminLogDateTime, parseAdminLogStatusCode } from "../shared/admin-log-filters";

describe("admin log filters", () => {
  it("accepts only known log levels", () => {
    expect(isAdminLogLevel("error")).toBe(true);
    expect(isAdminLogLevel("debug")).toBe(false);
    expect(isLogSource("client")).toBe(true);
    expect(isLogSource("browser")).toBe(false);
  });

  it("parses valid status codes and rejects invalid values", () => {
    expect(parseAdminLogStatusCode("500")).toBe(500);
    expect(parseAdminLogStatusCode("")).toBeNull();
    expect(() => parseAdminLogStatusCode("99")).toThrow("Invalid statusCode");
    expect(() => parseAdminLogStatusCode("abc")).toThrow("Invalid statusCode");
  });

  it("normalizes date inputs and rejects invalid dates", () => {
    expect(normalizeAdminLogDateTime("", "from")).toBe("");
    expect(normalizeAdminLogDateTime("2026-07-07T10:00", "from")).toContain("2026-07-07");
    expect(() => normalizeAdminLogDateTime("not-a-date", "from")).toThrow("Invalid from");
  });
});
