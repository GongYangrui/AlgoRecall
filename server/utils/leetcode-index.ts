import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { matchesLeetcodeQuery, parseTags } from "@shared/problems";
import type { LeetcodeQuestion } from "@shared/types";

let cachedQuestions: LeetcodeQuestion[] | null = null;

async function loadQuestions() {
  if (!cachedQuestions) {
    const file = await readFile(join(process.cwd(), "data", "leetcode_details.json"), "utf8");
    cachedQuestions = JSON.parse(file) as LeetcodeQuestion[];
  }

  return cachedQuestions;
}

export async function searchLeetcodeQuestions(q: string, limit = 20) {
  const questions = await loadQuestions();
  const trimmed = q.trim();
  if (!trimmed) return [];

  return questions
    .filter((question) => matchesLeetcodeQuery(question, trimmed))
    .sort((a, b) => Number(a.questionFrontendId) - Number(b.questionFrontendId))
    .slice(0, limit)
    .map((question) => ({
      questionFrontendId: question.questionFrontendId,
      title: question.title,
      titleSlug: question.titleSlug,
      titleCn: question.titleCn,
      difficulty: question.difficulty,
      tags: parseTags(question.tags),
      tagsCn: parseTags(question.tagsCn),
      urlEn: question.urlEn,
      urlCn: question.urlCn,
    }));
}
