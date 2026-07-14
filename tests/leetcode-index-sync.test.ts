import { describe, expect, it } from "vitest";
// The production sync is a plain Node.js module so it can run inside the deployment image.
// @ts-expect-error The JavaScript CLI intentionally has no separate declaration file.
import {
  loadAndValidateQuestions,
  syncLeetcodeQuestions,
  validateAndNormalizeQuestions,
} from "../scripts/sync-leetcode-index.mjs";

function question(titleSlug: string, questionFrontendId: string, overrides: Record<string, unknown> = {}) {
  return {
    titleSlug,
    questionFrontendId,
    title: `Question ${questionFrontendId}`,
    titleCn: `题目 ${questionFrontendId}`,
    difficulty: "medium",
    tags: ["Tree"],
    tagsCn: ["树"],
    urlEn: `https://leetcode.com/problems/${titleSlug}`,
    urlCn: `https://leetcode.cn/problems/${titleSlug}`,
    ...overrides,
  };
}

type MergeCounts = { inserted: number; updated: number; unchanged: number; deleted: number };

function fakeClient(counts: MergeCounts, options: { failMerge?: boolean } = {}) {
  const queries: string[] = [];
  return {
    queries,
    async query(text: string) {
      const normalized = text.trim();
      queries.push(normalized);
      if (normalized.startsWith("WITH existing")) {
        if (options.failMerge) throw new Error("merge failed");
        return {
          rows: [{
            inserted: counts.inserted,
            updated: counts.updated,
            unchanged: counts.unchanged,
            affected: counts.inserted + counts.updated,
          }],
          rowCount: 1,
        };
      }
      if (normalized.startsWith("DELETE FROM leetcode_questions")) {
        return { rows: [], rowCount: counts.deleted };
      }
      if (normalized.includes("FROM leetcode_questions_sync") && normalized.startsWith("SELECT count")) {
        return { rows: [{ count: counts.inserted + counts.updated + counts.unchanged }], rowCount: 1 };
      }
      if (normalized === "SELECT count(*)::int AS count FROM leetcode_questions") {
        return { rows: [{ count: counts.inserted + counts.updated + counts.unchanged }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

describe("LeetCode index source validation", () => {
  it("validates the shipped catalog and omits problem content", async () => {
    const questions = await loadAndValidateQuestions();
    expect(questions.length).toBeGreaterThanOrEqual(3_000);
    expect(questions.find((item: { titleSlug: string }) => item.titleSlug === "binary-tree-level-order-traversal")).toMatchObject({
      questionFrontendId: "102",
      title: "Binary Tree Level Order Traversal",
    });
    expect(questions[0]).not.toHaveProperty("content");
    expect(questions[0]).not.toHaveProperty("contentCn");
  });

  it("rejects truncated, duplicate, and invalid catalogs", () => {
    expect(() => validateAndNormalizeQuestions([], { minimumQuestions: 1 })).toThrow("expected at least 1");
    expect(() => validateAndNormalizeQuestions([
      question("one", "1"),
      question("one", "2"),
    ], { minimumQuestions: 1 })).toThrow("Duplicate titleSlug");
    expect(() => validateAndNormalizeQuestions([
      question("one", "1", { difficulty: "unknown" }),
    ], { minimumQuestions: 1 })).toThrow("invalid difficulty");
  });
});

describe("LeetCode index transaction", () => {
  const source = [question("one", "1"), question("two", "2")];

  it("reports first import and unchanged repeat without unconditional updates", async () => {
    const first = fakeClient({ inserted: 2, updated: 0, unchanged: 0, deleted: 0 });
    await expect(syncLeetcodeQuestions(first, source, { minimumQuestions: 1 })).resolves.toEqual({
      sourceTotal: 2,
      inserted: 2,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      finalTotal: 2,
    });
    const mergeSql = first.queries.find((query) => query.startsWith("WITH existing"));
    expect(mergeSql).toContain("IS DISTINCT FROM");
    expect(first.queries.at(-1)).toBe("COMMIT");

    const repeat = fakeClient({ inserted: 0, updated: 0, unchanged: 2, deleted: 0 });
    await expect(syncLeetcodeQuestions(repeat, source, { minimumQuestions: 1 })).resolves.toMatchObject({
      inserted: 0,
      updated: 0,
      unchanged: 2,
    });
  });

  it("reports changed and stale rows", async () => {
    const client = fakeClient({ inserted: 0, updated: 1, unchanged: 1, deleted: 1 });
    await expect(syncLeetcodeQuestions(client, source, { minimumQuestions: 1 })).resolves.toMatchObject({
      updated: 1,
      deleted: 1,
      unchanged: 1,
    });
  });

  it("rolls back when the merge fails", async () => {
    const client = fakeClient({ inserted: 0, updated: 0, unchanged: 2, deleted: 0 }, { failMerge: true });
    await expect(syncLeetcodeQuestions(client, source, { minimumQuestions: 1 })).rejects.toThrow("merge failed");
    expect(client.queries).toContain("ROLLBACK");
    expect(client.queries).not.toContain("COMMIT");
  });
});
