import { describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({ db: {} }));

import { getLeetcodeQuestionBySlug } from "../server/utils/leetcode-index";

function lookupClient(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  };
}

describe("getLeetcodeQuestionBySlug", () => {
  it("prefers a PostgreSQL index row", async () => {
    const row = {
      titleSlug: "two-sum",
      questionFrontendId: "1",
      title: "Database title",
      titleCn: "数据库标题",
      difficulty: "easy",
      tags: '["Array"]',
      tagsCn: '["数组"]',
      urlEn: "https://leetcode.com/problems/two-sum",
      urlCn: "https://leetcode.cn/problems/two-sum",
      updatedAt: new Date().toISOString(),
    };
    const result = await getLeetcodeQuestionBySlug("two-sum", lookupClient([row]) as never);
    expect(result).toMatchObject({ title: "Database title", tags: ["Array"], tagsCn: ["数组"] });
  });

  it("falls back to the JSON catalog for problem 102", async () => {
    const result = await getLeetcodeQuestionBySlug(
      "binary-tree-level-order-traversal",
      lookupClient([]) as never,
    );
    expect(result).toMatchObject({
      questionFrontendId: "102",
      titleSlug: "binary-tree-level-order-traversal",
      title: "Binary Tree Level Order Traversal",
      titleCn: "二叉树的层序遍历",
      difficulty: "medium",
    });
  });

  it("returns null only when both indexes miss", async () => {
    await expect(getLeetcodeQuestionBySlug("definitely-not-a-real-question", lookupClient([]) as never)).resolves.toBeNull();
  });
});
