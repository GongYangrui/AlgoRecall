import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { matchesLeetcodeQuery, parseTags } from "@shared/problems";
import type { LeetcodeQuestion } from "@shared/types";
import { db } from "../db";
import { leetcodeQuestions } from "../db/schema";

let cachedQuestions: LeetcodeQuestion[] | null = null;
type LeetcodeQuestionLookupClient = Pick<typeof db, "select">;

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

export async function getLeetcodeQuestionBySlug(titleSlug: string, client: LeetcodeQuestionLookupClient = db) {
  const [row] = await client
    .select()
    .from(leetcodeQuestions)
    .where(eq(leetcodeQuestions.titleSlug, titleSlug))
    .limit(1);
  if (row) return toLeetcodeQuestionSummary({
    questionFrontendId: row.questionFrontendId,
    title: row.title,
    titleSlug: row.titleSlug,
    titleCn: row.titleCn,
    difficulty: row.difficulty,
    tags: row.tags,
    tagsCn: row.tagsCn,
    urlEn: row.urlEn,
    urlCn: row.urlCn,
  });

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
  const trimmed = q.trim();
  if (!trimmed) return [];

  const compact = trimmed.toLowerCase().replace(/\s+/g, "");
  const like = `%${trimmed.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
  const compactLike = `%${compact.replace(/[\\%_]/g, "\\$&")}%`;
  const searchText = sql`lower(coalesce(${leetcodeQuestions.questionFrontendId}, '') || ' ' || coalesce(${leetcodeQuestions.title}, '') || ' ' || coalesce(${leetcodeQuestions.titleCn}, '') || ' ' || coalesce(${leetcodeQuestions.titleSlug}, '') || ' ' || coalesce(${leetcodeQuestions.tags}, '') || ' ' || coalesce(${leetcodeQuestions.tagsCn}, ''))`;
  const rows = await db
    .select()
    .from(leetcodeQuestions)
    .where(sql`${searchText} LIKE ${like} ESCAPE '\\' OR replace(${searchText}, ' ', '') LIKE ${compactLike} ESCAPE '\\'`)
    .orderBy(
      sql`NULLIF(regexp_replace(${leetcodeQuestions.questionFrontendId}, '[^0-9]', '', 'g'), '')::int ASC NULLS LAST`,
      asc(leetcodeQuestions.questionFrontendId),
    )
    .limit(limit);

  if (rows.length > 0) {
    return rows.map((row) => toLeetcodeQuestionSummary({
      questionFrontendId: row.questionFrontendId,
      title: row.title,
      titleSlug: row.titleSlug,
      titleCn: row.titleCn,
      difficulty: row.difficulty,
      tags: row.tags,
      tagsCn: row.tagsCn,
      urlEn: row.urlEn,
      urlCn: row.urlCn,
    }));
  }

  const questions = await loadLeetcodeQuestions();
  return questions
    .filter((question) => matchesLeetcodeQuery(question, trimmed))
    .sort((a, b) => Number(a.questionFrontendId) - Number(b.questionFrontendId))
    .slice(0, limit)
    .map(toLeetcodeQuestionSummary);
}
