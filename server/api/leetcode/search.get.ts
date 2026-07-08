import { searchLeetcodeQuestions } from "../../utils/leetcode-index";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";
import { setLogOperation } from "../../utils/log-context";
import { assertRateLimit } from "../../utils/rate-limit";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  assertRateLimit(event, { bucket: "leetcode.search", key: session.user.id, limit: 60, windowMs: 60_000 });
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  setLogOperation(event, "leetcode.search", { q: q.trim().slice(0, 100) });
  if (!q.trim()) return [];

  const questions = await searchLeetcodeQuestions(q);
  const frontendIds = questions.map((question) => question.questionFrontendId);
  const existingProblems = frontendIds.length
    ? await db
        .select({ id: problems.id, frontendId: problems.frontendId })
        .from(problems)
        .where(and(eq(problems.userId, session.user.id), inArray(problems.frontendId, frontendIds)))
    : [];
  const importedByFrontendId = new Map(existingProblems.map((problem) => [problem.frontendId, problem.id]));

  return questions.map((question) => ({
    ...question,
    imported: importedByFrontendId.has(question.questionFrontendId),
    problemId: importedByFrontendId.get(question.questionFrontendId) ?? null,
  }));
});
