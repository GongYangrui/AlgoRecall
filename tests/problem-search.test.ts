import { describe, expect, it } from "vitest";
import { escapeLikePattern, normalizeProblemSearchQuery } from "../shared/problem-search";

describe("problem search helpers", () => {
  it("treats empty search as a normal unfiltered query", () => {
    expect(normalizeProblemSearchQuery("   ")).toEqual({
      raw: "",
      words: [],
      tooShort: false,
    });
  });

  it("requires every search word to have at least two characters", () => {
    expect(normalizeProblemSearchQuery("a").tooShort).toBe(true);
    expect(normalizeProblemSearchQuery("a dp").tooShort).toBe(true);
    expect(normalizeProblemSearchQuery("dp").tooShort).toBe(false);
    expect(normalizeProblemSearchQuery("动态 规划").tooShort).toBe(false);
  });

  it("normalizes dotted and spaced keywords into lowercase AND words", () => {
    expect(normalizeProblemSearchQuery("Two.Sum  DP").words).toEqual(["two", "sum", "dp"]);
  });

  it("escapes LIKE wildcard characters", () => {
    expect(escapeLikePattern(String.raw`100%_match\case`)).toBe(String.raw`100\%\_match\\case`);
  });
});
