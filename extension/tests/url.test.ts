import { describe, expect, it } from "vitest";
import { parseLeetcodeTitleSlug } from "../src/url";

describe("parseLeetcodeTitleSlug", () => {
  it("parses Chinese and global problem URLs", () => {
    expect(parseLeetcodeTitleSlug("https://leetcode.cn/problems/two-sum/description/" )).toBe("two-sum");
    expect(parseLeetcodeTitleSlug("https://leetcode.com/problems/trapping-rain-water/submissions/" )).toBe("trapping-rain-water");
  });

  it("rejects non-problem and lookalike origins", () => {
    expect(parseLeetcodeTitleSlug("https://leetcode.com/problemset/" )).toBeNull();
    expect(parseLeetcodeTitleSlug("https://leetcode.com.example.org/problems/two-sum/" )).toBeNull();
  });
});
