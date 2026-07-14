import { describe, expect, it } from "vitest";
import { safeInternalRedirect } from "../app/utils/safe-redirect";

describe("safeInternalRedirect", () => {
  it("keeps same-origin paths and query strings", () => {
    expect(safeInternalRedirect("/extension/connect?pairing=abc&code=ABCD-EFGH")).toBe(
      "/extension/connect?pairing=abc&code=ABCD-EFGH",
    );
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeInternalRedirect("https://example.com/steal")).toBe("/app");
    expect(safeInternalRedirect("//example.com/steal")).toBe("/app");
    expect(safeInternalRedirect(undefined)).toBe("/app");
  });
});
