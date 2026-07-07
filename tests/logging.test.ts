import { describe, expect, it } from "vitest";
import { buildDiagnosticPayload, buildLogEntry, sanitizeLogValue } from "../shared/logging";

describe("logging helpers", () => {
  it("sanitizes nested sensitive fields and truncates long strings", () => {
    const sanitized = sanitizeLogValue({
      Authorization: "Bearer secret",
      nested: {
        token: "abc",
        safe: "ok",
      },
      list: [{ password: "hidden" }],
      long: "x".repeat(5000),
    }) as Record<string, unknown>;

    expect(sanitized.Authorization).toBe("***");
    expect(sanitized.nested).toEqual({ token: "***", safe: "ok" });
    expect(sanitized.list).toEqual([{ password: "***" }]);
    expect(String(sanitized.long)).toContain("[truncated");
  });

  it("builds enriched log entries with request and operation metadata", () => {
    const entry = buildLogEntry(
      "error",
      "server.unhandled_error",
      {
        message: "Boom",
        source: "server",
        operation: "review.submit",
        requestId: "req-1",
        request: { path: "/api/reviews", query: { a: "1" }, ip: "127.0.0.1" },
        metadata: { context: { problemId: "p1" } },
      },
      { appVersion: "abc123", environment: "test" },
    );

    expect(entry.source).toBe("server");
    expect(entry.appVersion).toBe("abc123");
    expect(entry.environment).toBe("test");
    expect(entry.metadata?.operation).toBe("review.submit");
    expect(entry.metadata?.request).toEqual({ path: "/api/reviews", query: { a: "1" }, ip: "127.0.0.1" });
  });

  it("builds compact diagnostic payloads", () => {
    const payload = buildDiagnosticPayload({
      timestamp: "2026-07-07T10:00:00.000Z",
      event: "server.unhandled_error",
      message: "Boom",
      errorStack: "stack",
      route: "/api/reviews",
      requestId: "req-1",
      statusCode: 500,
      appVersion: "dev",
      metadata: {
        operation: "review.submit",
        request: { path: "/api/reviews" },
      },
    });

    expect(payload).toMatchObject({
      event: "server.unhandled_error",
      operation: "review.submit",
      request: { path: "/api/reviews" },
      stack: "stack",
    });
  });
});
