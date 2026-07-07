import { describe, expect, it } from "vitest";
import { normalizeClientErrorPayload } from "../shared/client-error";

describe("normalizeClientErrorPayload", () => {
  it("rejects empty payloads", () => {
    expect(normalizeClientErrorPayload(null)).toBeNull();
    expect(normalizeClientErrorPayload({ message: "" })).toBeNull();
  });

  it("normalizes and truncates client error fields", () => {
    const payload = normalizeClientErrorPayload({
      message: "x".repeat(1500),
      name: "TypeError",
      stack: "stack",
      route: "/app",
      userAgent: "browser",
      componentInfo: "render",
      appVersion: "dev",
    });

    expect(payload?.message).toContain("[truncated");
    expect(payload?.name).toBe("TypeError");
    expect(payload?.route).toBe("/app");
  });
});
