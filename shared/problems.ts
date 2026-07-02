import type { LeetcodeQuestion, Problem } from "./types";

export function parseTags(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim());

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim());
    }
  } catch {
    // Fall through to comma parsing.
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function displayProblemNumber(problem: Pick<Problem, "frontendId"> | Pick<LeetcodeQuestion, "questionFrontendId">) {
  if ("frontendId" in problem) return problem.frontendId ? `#${problem.frontendId}` : "#--";
  return problem.questionFrontendId ? `#${problem.questionFrontendId}` : "#--";
}

export function displayProblemTitle(problem: Pick<Problem, "title" | "titleCn"> | Pick<LeetcodeQuestion, "title" | "titleCn">) {
  return problem.titleCn || problem.title;
}

export function displayProblemTags(problem: Pick<Problem, "tags" | "tagsCn"> | Pick<LeetcodeQuestion, "tags" | "tagsCn">) {
  const cn = parseTags(problem.tagsCn);
  return cn.length > 0 ? cn : parseTags(problem.tags);
}

export function difficultyLabel(difficulty: string) {
  const labels: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  };
  return labels[difficulty.toLowerCase()] ?? difficulty;
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "新题",
    learning: "学习中",
    reviewing: "复习中",
    mastered: "已掌握",
  };
  return labels[status] ?? status;
}

export function resultLabel(result: string) {
  const labels: Record<string, string> = {
    easy: "顺利做出",
    hard: "卡住了",
    solution: "看了题解",
    mastered: "已掌握",
  };
  return labels[result] ?? result;
}

export function matchesLeetcodeQuery(question: LeetcodeQuestion, q: string) {
  const compactQuery = q.toLowerCase().replace(/\s+/g, "");
  const haystack = [
    question.questionFrontendId,
    question.titleSlug,
    question.title,
    question.titleCn,
    `${question.questionFrontendId}.${question.title}`,
    `${question.questionFrontendId}.${question.titleCn ?? ""}`,
    ...parseTags(question.tags),
    ...parseTags(question.tagsCn),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q.toLowerCase()) || haystack.replace(/\s+/g, "").includes(compactQuery);
}
