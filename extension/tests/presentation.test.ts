import { describe, expect, it } from "vitest";
import { orderProblemTitles } from "../src/presentation";

describe("orderProblemTitles", () => {
  const problem = { title: "Longest Substring Without Repeating Characters", titleCn: "无重复字符的最长子串" };

  it("puts Chinese first on leetcode.cn", () => {
    expect(orderProblemTitles(problem, "https://leetcode.cn/problems/longest-substring-without-repeating-characters/"))
      .toEqual({ primary: "无重复字符的最长子串", secondary: "Longest Substring Without Repeating Characters" });
  });

  it("puts English first on leetcode.com", () => {
    expect(orderProblemTitles(problem, "https://leetcode.com/problems/longest-substring-without-repeating-characters/"))
      .toEqual({ primary: "Longest Substring Without Repeating Characters", secondary: "无重复字符的最长子串" });
  });

  it("shows one title when the Chinese title is missing", () => {
    expect(orderProblemTitles({ title: "Two Sum", titleCn: null }, "https://leetcode.cn/problems/two-sum/"))
      .toEqual({ primary: "Two Sum", secondary: null });
  });

  it("removes duplicate bilingual titles", () => {
    expect(orderProblemTitles({ title: "Two Sum", titleCn: " two sum " }, "https://leetcode.cn/problems/two-sum/"))
      .toEqual({ primary: "two sum", secondary: null });
  });
});
