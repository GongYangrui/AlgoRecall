import { describe, expect, it } from "vitest";
import { formatProblemTitle } from "../src/presentation";

describe("formatProblemTitle", () => {
  const problem = { title: "Longest Substring Without Repeating Characters", titleCn: "无重复字符的最长子串" };

  it("formats a single Chinese-first bilingual title", () => {
    expect(formatProblemTitle(problem))
      .toBe("无重复字符的最长子串 · Longest Substring Without Repeating Characters");
  });

  it("shows one title when the Chinese title is missing", () => {
    expect(formatProblemTitle({ title: "Two Sum", titleCn: null })).toBe("Two Sum");
  });

  it("shows one title when the English title is missing", () => {
    expect(formatProblemTitle({ title: " ", titleCn: "两数之和" })).toBe("两数之和");
  });

  it("removes duplicate bilingual titles", () => {
    expect(formatProblemTitle({ title: "Two Sum", titleCn: " two sum " })).toBe("two sum");
  });
});
