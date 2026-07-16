import { describe, expect, it } from "vitest";
import { buildLeetcodeProblemUrl, getLeetcodeSiteLabel, parseLeetcodeTitleSlug, selectNextDueProblem } from "../src/url";

describe("parseLeetcodeTitleSlug", () => {
  it("parses Chinese and global problem URLs", () => {
    expect(parseLeetcodeTitleSlug("https://leetcode.cn/problems/two-sum/description/" )).toBe("two-sum");
    expect(parseLeetcodeTitleSlug("https://leetcode.com/problems/trapping-rain-water/submissions/" )).toBe("trapping-rain-water");
  });

  it("rejects non-problem and lookalike origins", () => {
    expect(parseLeetcodeTitleSlug("https://leetcode.com/problemset/" )).toBeNull();
    expect(parseLeetcodeTitleSlug("https://leetcode.com.example.org/problems/two-sum/" )).toBeNull();
  });

  it("builds same-site problem URLs", () => {
    expect(buildLeetcodeProblemUrl("https://leetcode.cn/problemset/", "3sum"))
      .toBe("https://leetcode.cn/problems/3sum/");
    expect(buildLeetcodeProblemUrl("https://leetcode.com/contest/weekly-contest-400/", "Binary-Tree"))
      .toBe("https://leetcode.com/problems/binary-tree/");
    expect(buildLeetcodeProblemUrl("https://leetcode.com.example.org/problems/two-sum/", "3sum"))
      .toBeNull();
  });

  it("labels the exact Chinese and global LeetCode sites", () => {
    expect(getLeetcodeSiteLabel("https://leetcode.cn/problemset/")).toBe("LeetCode 中文站");
    expect(getLeetcodeSiteLabel("https://leetcode.com/explore/")).toBe("LeetCode 英文站");
    expect(getLeetcodeSiteLabel("https://leetcode.com.example.org/")).toBe("LeetCode");
  });

  it("selects the first queued problem other than the current problem", () => {
    const problems = [{ titleSlug: "two-sum" }, { titleSlug: "3sum" }, { titleSlug: "four-sum" }];
    expect(selectNextDueProblem(problems, "two-sum"))?.toEqual({ titleSlug: "3sum" });
    expect(selectNextDueProblem([{ titleSlug: "two-sum" }], "two-sum")).toBeNull();
    expect(selectNextDueProblem(problems, null))?.toEqual({ titleSlug: "two-sum" });
  });
});
