import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { format } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  STUDY_LIST_DEFAULT_DAILY_NEW,
  STUDY_LIST_REVIEW_PRESSURE_LIMIT,
  calculateStudyListProgress,
  inferStudyListStatusFromProblem,
  isCoveredStudyListStatus,
  type StudyListItemStatus,
  type StudyListMode,
} from "@shared/study-lists";
import { getToday, isDue } from "@shared/schedule";
import type {
  LeetcodeQuestion,
  Problem,
  ProblemSource,
  StudyListDetail,
  StudyListQuestion,
  StudyListSnapshot,
  StudyListSummary,
  TodayNewStudyItem,
  TodayStudyPlan,
} from "@shared/types";
import { db } from "../db";
import { problems, studyListEnrollments, studyListItemProgress } from "../db/schema";
import { getLeetcodeQuestionBySlug, getLeetcodeQuestionMapBySlug } from "./leetcode-index";

let cachedStudyLists: StudyListSnapshot[] | null = null;

export async function loadStudyLists() {
  if (!cachedStudyLists) {
    const file = await readFile(join(process.cwd(), "data", "study_lists.json"), "utf8");
    cachedStudyLists = JSON.parse(file) as StudyListSnapshot[];
  }

  return cachedStudyLists;
}

export async function getStudyList(slug: string) {
  const lists = await loadStudyLists();
  return lists.find((list) => list.slug === slug) ?? null;
}

function nowString() {
  return format(new Date(), "yyyy-MM-dd HH:mm:ss");
}

function normalizeDailyNewCount(value: number | null | undefined) {
  if (!Number.isFinite(value)) return STUDY_LIST_DEFAULT_DAILY_NEW;
  return Math.min(20, Math.max(0, Math.trunc(value ?? STUDY_LIST_DEFAULT_DAILY_NEW)));
}

function problemStudyStatus(problem: Problem | null, mode: StudyListMode): StudyListItemStatus {
  return inferStudyListStatusFromProblem(problem, mode);
}

export async function getProblemSources(userId: string, problemIds: string[]) {
  const uniqueProblemIds = [...new Set(problemIds.filter(Boolean))];
  const sourcesByProblemId = new Map<string, ProblemSource[]>();
  if (uniqueProblemIds.length === 0) return sourcesByProblemId;

  const rows = await db
    .select()
    .from(studyListItemProgress)
    .where(and(eq(studyListItemProgress.userId, userId), inArray(studyListItemProgress.problemId, uniqueProblemIds)));
  const lists = await loadStudyLists();
  const titleBySlug = new Map(lists.map((list) => [list.slug, list.title]));

  for (const row of rows) {
    if (!row.problemId) continue;
    const sources = sourcesByProblemId.get(row.problemId) ?? [];
    sources.push({
      kind: "study_list",
      studyListSlug: row.studyListSlug,
      title: titleBySlug.get(row.studyListSlug) ?? row.studyListSlug,
      status: row.status,
      mode: row.mode,
    });
    sourcesByProblemId.set(row.problemId, sources);
  }

  for (const problemId of uniqueProblemIds) {
    if (!sourcesByProblemId.has(problemId)) {
      sourcesByProblemId.set(problemId, [{ kind: "manual", studyListSlug: null, title: "手动加入" }]);
    }
  }

  return sourcesByProblemId;
}

export async function attachProblemSources<T extends Problem>(userId: string, items: T[]) {
  const sourcesByProblemId = await getProblemSources(userId, items.map((item) => item.id));
  return items.map((item) => ({
    ...item,
    sources: sourcesByProblemId.get(item.id) ?? [{ kind: "manual", studyListSlug: null, title: "手动加入" }],
  }));
}

async function getUserProblemsByTitleSlug(userId: string, titleSlugs: string[]) {
  const uniqueSlugs = [...new Set(titleSlugs.filter(Boolean))];
  if (uniqueSlugs.length === 0) return new Map<string, Problem>();

  const rows = await db
    .select()
    .from(problems)
    .where(and(eq(problems.userId, userId), inArray(problems.titleSlug, uniqueSlugs)));
  return new Map(rows.filter((problem) => problem.titleSlug).map((problem) => [problem.titleSlug!, problem as Problem]));
}

async function getProgressRows(userId: string, studyListSlug?: string) {
  if (studyListSlug) {
    return db
      .select()
      .from(studyListItemProgress)
      .where(and(eq(studyListItemProgress.userId, userId), eq(studyListItemProgress.studyListSlug, studyListSlug)));
  }

  return db.select().from(studyListItemProgress).where(eq(studyListItemProgress.userId, userId));
}

export async function listStudyListSummaries(userId: string): Promise<StudyListSummary[]> {
  const lists = await loadStudyLists();
  const enrollments = await db.select().from(studyListEnrollments).where(eq(studyListEnrollments.userId, userId));
  const progressRows = await getProgressRows(userId);
  const enrollmentBySlug = new Map(enrollments.map((enrollment) => [enrollment.studyListSlug, enrollment]));
  const progressBySlug = new Map<string, typeof progressRows>();
  const allTitleSlugs = lists.flatMap((list) => list.items.map((item) => item.titleSlug));
  const problemBySlug = await getUserProblemsByTitleSlug(userId, allTitleSlugs);

  for (const row of progressRows) {
    const rows = progressBySlug.get(row.studyListSlug) ?? [];
    rows.push(row);
    progressBySlug.set(row.studyListSlug, rows);
  }

  return lists.map((list) => {
    const enrollment = enrollmentBySlug.get(list.slug);
    const progressByTitleSlug = new Map((progressBySlug.get(list.slug) ?? []).map((row) => [row.titleSlug, row]));
    const projectedItems = list.items.map((item) => {
      const progress = progressByTitleSlug.get(item.titleSlug);
      if (progress) return { status: progress.status };
      return {
        status: inferStudyListStatusFromProblem(problemBySlug.get(item.titleSlug), "follow_existing"),
      };
    });
    const progress = calculateStudyListProgress(projectedItems);

    return {
      slug: list.slug,
      title: list.title,
      description: list.description,
      sourceUrl: list.sourceUrl,
      locale: list.locale,
      total: list.items.length,
      enrolled: Boolean(enrollment),
      dailyNewCount: enrollment?.dailyNewCount ?? null,
      active: enrollment?.active === 1,
      completed: progress.completed,
      percent: progress.percent,
    };
  });
}

export async function startStudyList(
  userId: string,
  studyListSlug: string,
  options: { dailyNewCount?: number | null; mode?: StudyListMode | string | null },
) {
  const list = await getStudyList(studyListSlug);
  if (!list) return null;

  const now = nowString();
  const dailyNewCount = normalizeDailyNewCount(options.dailyNewCount);
  const mode: StudyListMode = options.mode === "restart_in_list" ? "restart_in_list" : "follow_existing";

  const existingEnrollment = await db
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.studyListSlug, studyListSlug)))
    .limit(1);

  if (existingEnrollment.length === 0) {
    await db.insert(studyListEnrollments).values({
      id: uuidv4(),
      userId,
      studyListSlug,
      dailyNewCount,
      active: 1,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(studyListEnrollments)
      .set({ dailyNewCount, active: 1, updatedAt: now })
      .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.studyListSlug, studyListSlug)));
  }

  const titleSlugs = list.items.map((item) => item.titleSlug);
  const problemBySlug = await getUserProblemsByTitleSlug(userId, titleSlugs);
  const existingProgress = await getProgressRows(userId, studyListSlug);
  const existingProgressSlugs = new Set(existingProgress.map((row) => row.titleSlug));

  for (const item of list.items) {
    if (existingProgressSlugs.has(item.titleSlug)) continue;
    const problem = problemBySlug.get(item.titleSlug) ?? null;
    await db.insert(studyListItemProgress).values({
      id: uuidv4(),
      userId,
      studyListSlug,
      titleSlug: item.titleSlug,
      problemId: problem?.id ?? null,
      order: item.order,
      mode,
      status: problemStudyStatus(problem, mode),
      learnedAt: problem && problemStudyStatus(problem, mode) !== "not_started" ? problem.lastReviewedAt ?? now : null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return getStudyListDetail(userId, studyListSlug);
}

export async function updateStudyListItemMode(userId: string, studyListSlug: string, titleSlug: string, mode: StudyListMode) {
  const list = await getStudyList(studyListSlug);
  if (!list?.items.some((item) => item.titleSlug === titleSlug)) return null;

  const [problem] = await db
    .select()
    .from(problems)
    .where(and(eq(problems.userId, userId), eq(problems.titleSlug, titleSlug)))
    .limit(1);
  const status = problemStudyStatus((problem as Problem | undefined) ?? null, mode);

  await db
    .update(studyListItemProgress)
    .set({
      mode,
      status,
      problemId: problem?.id ?? null,
      learnedAt: status === "not_started" ? null : problem?.lastReviewedAt ?? nowString(),
      updatedAt: nowString(),
    })
    .where(
      and(
        eq(studyListItemProgress.userId, userId),
        eq(studyListItemProgress.studyListSlug, studyListSlug),
        eq(studyListItemProgress.titleSlug, titleSlug),
      ),
    );

  return getStudyListDetail(userId, studyListSlug);
}

async function ensureProblemForStudyItem(userId: string, titleSlug: string) {
  const [existing] = await db
    .select()
    .from(problems)
    .where(and(eq(problems.userId, userId), eq(problems.titleSlug, titleSlug)))
    .limit(1);
  if (existing) return existing as Problem;

  const question = await getLeetcodeQuestionBySlug(titleSlug);
  if (!question) return null;

  const now = nowString();
  const [created] = await db
    .insert(problems)
    .values({
      id: uuidv4(),
      userId,
      title: question.title,
      titleCn: question.titleCn || null,
      titleSlug: question.titleSlug,
      frontendId: question.questionFrontendId,
      url: question.urlCn || question.urlEn,
      urlEn: question.urlEn,
      urlCn: question.urlCn,
      platform: "leetcode",
      difficulty: question.difficulty,
      tags: Array.isArray(question.tags) ? question.tags.join(", ") : question.tags,
      tagsCn: Array.isArray(question.tagsCn) ? question.tagsCn.join(", ") : question.tagsCn,
      status: "new",
      stage: 0,
      lastResult: null,
      wrongCount: 0,
      nextReviewAt: getToday(),
      lastReviewedAt: null,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created as Problem;
}

export async function startStudyListItem(userId: string, studyListSlug: string, titleSlug: string) {
  const list = await getStudyList(studyListSlug);
  const item = list?.items.find((candidate) => candidate.titleSlug === titleSlug);
  if (!list || !item) return null;

  const existingProgress = await db
    .select()
    .from(studyListItemProgress)
    .where(
      and(
        eq(studyListItemProgress.userId, userId),
        eq(studyListItemProgress.studyListSlug, studyListSlug),
        eq(studyListItemProgress.titleSlug, titleSlug),
      ),
    )
    .limit(1);

  if (existingProgress.length === 0) {
    await startStudyList(userId, studyListSlug, { mode: "follow_existing" });
  }

  const problem = await ensureProblemForStudyItem(userId, titleSlug);
  if (!problem) return null;

  const [progress] = await db
    .select()
    .from(studyListItemProgress)
    .where(
      and(
        eq(studyListItemProgress.userId, userId),
        eq(studyListItemProgress.studyListSlug, studyListSlug),
        eq(studyListItemProgress.titleSlug, titleSlug),
      ),
    )
    .limit(1);
  const status = progress?.mode === "follow_existing" && problemStudyStatus(problem, "follow_existing") !== "not_started" ? problemStudyStatus(problem, "follow_existing") : "planned";

  await db
    .update(studyListItemProgress)
    .set({ problemId: problem.id, status, updatedAt: nowString() })
    .where(
      and(
        eq(studyListItemProgress.userId, userId),
        eq(studyListItemProgress.studyListSlug, studyListSlug),
        eq(studyListItemProgress.titleSlug, titleSlug),
      ),
    );

  return problem;
}

export async function markStudyListProgressReviewed(userId: string, problem: Problem, context?: { studyListSlug?: string | null; titleSlug?: string | null }) {
  const titleSlug = context?.titleSlug || problem.titleSlug;
  if (!titleSlug) return;

  const now = nowString();
  const rows = await db
    .select()
    .from(studyListItemProgress)
    .where(and(eq(studyListItemProgress.userId, userId), eq(studyListItemProgress.titleSlug, titleSlug)));

  for (const row of rows) {
    const isExplicitContext = context?.studyListSlug === row.studyListSlug;
    const isSamePlannedProblem = row.problemId === problem.id && (row.status === "planned" || row.status === "not_started");
    const shouldUpdate = isExplicitContext || row.mode === "follow_existing" || isSamePlannedProblem;
    if (!shouldUpdate) continue;

    await db
      .update(studyListItemProgress)
      .set({
        problemId: problem.id,
        status: problem.status === "mastered" ? "mastered" : "learned",
        learnedAt: now,
        updatedAt: now,
      })
      .where(eq(studyListItemProgress.id, row.id));
  }
}

export async function getStudyListDetail(userId: string, studyListSlug: string): Promise<StudyListDetail | null> {
  const list = await getStudyList(studyListSlug);
  if (!list) return null;

  const [enrollment] = await db
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.studyListSlug, studyListSlug)))
    .limit(1);
  const progressRows = await getProgressRows(userId, studyListSlug);
  const progressBySlug = new Map(progressRows.map((row) => [row.titleSlug, row]));
  const questionBySlug = await getLeetcodeQuestionMapBySlug();
  const problemBySlug = await getUserProblemsByTitleSlug(userId, list.items.map((item) => item.titleSlug));
  const sourcesByProblemId = await getProblemSources(
    userId,
    [...problemBySlug.values()].map((problem) => problem.id),
  );

  const items: StudyListQuestion[] = list.items.map((item) => {
    const question = questionBySlug.get(item.titleSlug) as LeetcodeQuestion | undefined;
    const progress = progressBySlug.get(item.titleSlug);
    const problem = progress?.problemId
      ? [...problemBySlug.values()].find((candidate) => candidate.id === progress.problemId) ?? null
      : problemBySlug.get(item.titleSlug) ?? null;
    const mode = (progress?.mode ?? "follow_existing") as StudyListMode;
    const status = progress?.status ?? problemStudyStatus(problem, mode);

    return {
      ...question!,
      order: item.order,
      enrolled: Boolean(enrollment),
      problem,
      status,
      mode,
      sources: problem ? sourcesByProblemId.get(problem.id) ?? [{ kind: "manual", studyListSlug: null, title: "手动加入" }] : [],
    };
  });
  const progress = calculateStudyListProgress(items);

  return {
    slug: list.slug,
    title: list.title,
    description: list.description,
    sourceUrl: list.sourceUrl,
    locale: list.locale,
    total: list.items.length,
    enrolled: Boolean(enrollment),
    dailyNewCount: enrollment?.dailyNewCount ?? null,
    active: enrollment?.active === 1,
    completed: progress.completed,
    percent: progress.percent,
    items,
  };
}

export async function getTodayStudyPlan(userId: string): Promise<TodayStudyPlan> {
  const today = getToday();
  const allProblems = (await db
    .select()
    .from(problems)
    .where(eq(problems.userId, userId))) as Problem[];
  const dueProblems = allProblems.filter((problem) => isDue(problem, today));
  const dueProblemIds = new Set(dueProblems.map((problem) => problem.id));
  const dueWithSources = await attachProblemSources(userId, dueProblems);
  const enrollments = await db
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.active, 1)));
  const dailyNewBudget = Math.max(STUDY_LIST_DEFAULT_DAILY_NEW, ...enrollments.map((enrollment) => enrollment.dailyNewCount));
  const adjustedBudget =
    dueProblems.length >= STUDY_LIST_REVIEW_PRESSURE_LIMIT
      ? 0
      : dueProblems.length >= Math.ceil(STUDY_LIST_REVIEW_PRESSURE_LIMIT / 2)
        ? Math.ceil(dailyNewBudget / 2)
        : dailyNewBudget;

  const lists = await loadStudyLists();
  const listBySlug = new Map(lists.map((list) => [list.slug, list]));
  const questionBySlug = await getLeetcodeQuestionMapBySlug();
  const selectedSlugs = new Set<string>();
  const newItems: TodayNewStudyItem[] = [];

  for (const enrollment of enrollments) {
    if (newItems.length >= adjustedBudget) break;
    const list = listBySlug.get(enrollment.studyListSlug);
    if (!list) continue;
    const progressRows = await getProgressRows(userId, enrollment.studyListSlug);
    const ordered = progressRows
      .filter((row) => !isCoveredStudyListStatus(row.status) && !selectedSlugs.has(row.titleSlug) && (!row.problemId || !dueProblemIds.has(row.problemId)))
      .sort((a, b) => a.order - b.order);

    for (const row of ordered) {
      if (newItems.length >= adjustedBudget) break;
      const question = questionBySlug.get(row.titleSlug);
      if (!question) continue;
      selectedSlugs.add(row.titleSlug);
      newItems.push({
        ...question,
        order: row.order,
        enrolled: true,
        problem: allProblems.find((problem) => problem.id === row.problemId) ?? null,
        status: "planned",
        mode: row.mode,
        sources: row.problemId ? (await getProblemSources(userId, [row.problemId])).get(row.problemId) ?? [] : [],
        studyListSlug: enrollment.studyListSlug,
        studyListTitle: list.title,
      });
    }
  }

  return {
    today,
    dueProblems: dueWithSources,
    newItems,
    totals: {
      problems: allProblems.length,
      mastered: allProblems.filter((problem) => problem.status === "mastered").length,
      due: dueWithSources.length,
      newItems: newItems.length,
      dailyNewBudget: adjustedBudget,
    },
  };
}
