import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { matchesLeetcodeQuery, parseTags } from "@shared/problems";
import type { LeetcodeQuestion } from "@shared/types";

let cachedQuestions: LeetcodeQuestion[] | null = null;

export async function loadLeetcodeQuestions() {
  if (!cachedQuestions) {
    const file = await readFile(join(process.cwd(), "data", "leetcode_details.json"), "utf8");
    cachedQuestions = JSON.parse(file) as LeetcodeQuestion[];
  }

  return cachedQuestions;
}

export function toLeetcodeQuestionSummary(question: LeetcodeQuestion) {
  return {
    questionFrontendId: question.questionFrontendId,
    title: question.title,
    titleSlug: question.titleSlug,
    titleCn: question.titleCn,
    difficulty: question.difficulty,
    tags: parseTags(question.tags),
    tagsCn: parseTags(question.tagsCn),
    urlEn: question.urlEn,
    urlCn: question.urlCn,
  };
}

export async function getLeetcodeQuestionBySlug(titleSlug: string) {
  const questions = await loadLeetcodeQuestions();
  const question = questions.find((item) => item.titleSlug === titleSlug);
  return question ? toLeetcodeQuestionSummary(question) : null;
}

export async function getLeetcodeQuestionMapBySlug() {
  const questions = await loadLeetcodeQuestions();
  return new Map(questions.map((question) => [question.titleSlug, toLeetcodeQuestionSummary(question)]));
}

export async function getLeetcodeQuestionMapByFrontendId() {
  const questions = await loadLeetcodeQuestions();
  return new Map(questions.map((question) => [question.questionFrontendId, toLeetcodeQuestionSummary(question)]));
}

export async function searchLeetcodeQuestions(q: string, limit = 20) {
  const questions = await loadLeetcodeQuestions();
  const trimmed = q.trim();
  if (!trimmed) return [];

  return questions
    .filter((question) => matchesLeetcodeQuery(question, trimmed))
    .sort((a, b) => Number(a.questionFrontendId) - Number(b.questionFrontendId))
    .slice(0, limit)
    .map(toLeetcodeQuestionSummary);
}
