import { describe, expect, it } from "vitest";
import { matchesLeetcodeQuery, parseTags } from "../shared/problems";
import { problemDifficulties, problemStatuses, reviewResults, type LeetcodeQuestion } from "../shared/types";

const question: LeetcodeQuestion = {
  questionFrontendId: "1",
  title: "Two Sum",
  titleSlug: "two-sum",
  titleCn: "两数之和",
  difficulty: "easy",
  tags: ["array", "hash-table"],
  tagsCn: ["数组", "哈希表"],
  urlEn: "https://leetcode.com/problems/two-sum",
  urlCn: "https://leetcode.cn/problems/two-sum",
};

describe("problem helpers", () => {
  it("parses JSON, comma-separated, and array tags", () => {
    expect(parseTags('["数组","哈希表"]')).toEqual(["数组", "哈希表"]);
    expect(parseTags("array, hash-table")).toEqual(["array", "hash-table"]);
    expect(parseTags(["dp", "graph"])).toEqual(["dp", "graph"]);
  });

  it("matches compact LeetCode search queries", () => {
    expect(matchesLeetcodeQuery(question, "1.TwoSum")).toBe(true);
    expect(matchesLeetcodeQuery(question, "两数")).toBe(true);
    expect(matchesLeetcodeQuery(question, "哈希")).toBe(true);
    expect(matchesLeetcodeQuery(question, "binary tree")).toBe(false);
  });

  it("keeps shared enum values aligned with backend constraints", () => {
    expect([...problemDifficulties]).toEqual(["easy", "medium", "hard"]);
    expect([...problemStatuses]).toEqual(["new", "learning", "reviewing", "mastered"]);
    expect([...reviewResults]).toEqual(["easy", "hard", "solution", "mastered"]);
  });
});
