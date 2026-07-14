import { describe, expect, it } from "vitest";
import {
  EXTENSION_PAIRING_POLL_INTERVAL_MS,
  EXTENSION_PAIRING_TTL_MS,
  EXTENSION_TOKEN_PREFIX,
  EXTENSION_TOKEN_TTL_MS,
  buildExtensionTodayProblems,
  resolveExtensionPairingClaimStatus,
} from "../shared/extension";
import type { Problem } from "../shared/types";
import {
  createExtensionToken,
  createPairingSecret,
  createUserCode,
  hashExtensionSecret,
} from "../server/utils/extension-credentials";

describe("extension credentials", () => {
  it("creates a prefixed 32-byte token and stores a one-way hash", () => {
    const token = createExtensionToken();
    const encoded = token.slice(EXTENSION_TOKEN_PREFIX.length);
    expect(token.startsWith(EXTENSION_TOKEN_PREFIX)).toBe(true);
    expect(Buffer.from(encoded, "base64url")).toHaveLength(32);
    expect(hashExtensionSecret(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashExtensionSecret(token)).not.toContain(token);
  });

  it("creates high-entropy pairing secrets and readable codes", () => {
    expect(Buffer.from(createPairingSecret(), "base64url")).toHaveLength(32);
    expect(createUserCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });
});

describe("extension expiry and pairing state", () => {
  const future = new Date("2030-01-01T00:00:00.000Z").toISOString();
  const past = new Date("2020-01-01T00:00:00.000Z").toISOString();

  it("preserves approved, denied and pending states before expiry", () => {
    const now = Date.parse("2029-01-01T00:00:00.000Z");
    expect(resolveExtensionPairingClaimStatus("approved", future, now)).toBe("approved");
    expect(resolveExtensionPairingClaimStatus("denied", future, now)).toBe("denied");
    expect(resolveExtensionPairingClaimStatus("pending", future, now)).toBe("pending");
  });

  it("rejects expired and already consumed pairings", () => {
    expect(resolveExtensionPairingClaimStatus("approved", past)).toBe("expired");
    expect(resolveExtensionPairingClaimStatus("consumed", future, Date.parse("2029-01-01T00:00:00.000Z"))).toBe("consumed");
  });

  it("uses the fixed plan durations", () => {
    expect(EXTENSION_PAIRING_TTL_MS).toBe(10 * 60 * 1000);
    expect(EXTENSION_PAIRING_POLL_INTERVAL_MS).toBe(5_000);
    expect(EXTENSION_TOKEN_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("extension today plan", () => {
  const problem = (overrides: Partial<Problem> = {}): Problem => ({
    id: "problem-1",
    userId: "user-1",
    title: "Two Sum",
    titleCn: "两数之和",
    titleSlug: "two-sum",
    frontendId: "1",
    tagsCn: "数组",
    url: "https://leetcode.cn/problems/two-sum/",
    urlEn: "https://leetcode.com/problems/two-sum/",
    urlCn: "https://leetcode.cn/problems/two-sum/",
    platform: "leetcode",
    difficulty: "easy",
    tags: "array",
    status: "reviewing",
    stage: 2,
    lastResult: "easy",
    wrongCount: 0,
    nextReviewAt: "2026-07-14",
    lastReviewedAt: null,
    reviewCount: 3,
    version: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  });

  it("preserves queue order while exposing only navigable LeetCode fields", () => {
    const result = buildExtensionTodayProblems([
      problem({ id: "first", titleSlug: "two-sum" }),
      problem({ id: "unsupported", titleSlug: null }),
      problem({ id: "second", titleSlug: "3sum", frontendId: "15" }),
    ]);

    expect(result.map((item) => item.id)).toEqual(["first", "second"]);
    expect(result[0]).toEqual({
      id: "first",
      title: "Two Sum",
      titleCn: "两数之和",
      titleSlug: "two-sum",
      frontendId: "1",
      difficulty: "easy",
      status: "reviewing",
      stage: 2,
      nextReviewAt: "2026-07-14",
      reviewCount: 3,
    });
  });
});
