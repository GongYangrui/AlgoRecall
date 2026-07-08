import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  STUDY_LIST_DEFAULT_DAILY_NEW,
  calculateStudyListProgress,
  getProblemSourcesFromStudyLists,
  inferStudyListStatusFromProblem,
  selectStudyListQueueBatch,
  type StudyListItemStatus,
} from "@shared/study-lists";
import { getToday, isDue } from "@shared/schedule";
import type {
  LeetcodeQuestion,
  Problem,
  ProblemSource,
  StudyListDetail,
  StudyListQuestion,
  StudyListQueueOption,
  StudyListQueueResult,
  StudyListSnapshot,
  StudyListSummary,
  TodayStudyPlan,
} from "@shared/types";
import { db } from "../db";
import { problems, studyListEnrollments, studyListItemProgress } from "../db/schema";
import { getLeetcodeQuestionBySlug, getLeetcodeQuestionMapBySlug } from "./leetcode-index";
import { measurePerformanceStage, type RequestPerformanceTimer } from "./performance";
import { nowIso } from "./time";

type DbClient = Pick<typeof db, "select" | "insert" | "update">;

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

function normalizeDailyNewCount(value: number | null | undefined) {
  if (!Number.isFinite(value)) return STUDY_LIST_DEFAULT_DAILY_NEW;
  return Math.min(20, Math.max(0, Math.trunc(value ?? STUDY_LIST_DEFAULT_DAILY_NEW)));
}

function problemStudyStatus(problem: Problem | null): StudyListItemStatus {
  return inferStudyListStatusFromProblem(problem, "follow_existing");
}

function queuedStudyStatus(problem: Problem): StudyListItemStatus {
  const status = problemStudyStatus(problem);
  return status === "not_started" ? "planned" : status;
}

function progressLearnedAt(status: StudyListItemStatus | string, problem: Problem, now: string) {
  if (status === "covered" || status === "mastered") return problem.lastReviewedAt ?? now;
  return null;
}

function legacyProblemStudyStatus(problem: Problem | null, mode: string): StudyListItemStatus {
  return inferStudyListStatusFromProblem(problem, mode);
}

export async function getProblemSources(userId: string, problemIds: string[]) {
  const uniqueProblemIds = [...new Set(problemIds.filter(Boolean))];
  const sourcesByProblemId = new Map<string, ProblemSource[]>();
  if (uniqueProblemIds.length === 0) return sourcesByProblemId;

  const problemRows = await db
    .select({
      id: problems.id,
      titleSlug: problems.titleSlug,
    })
    .from(problems)
    .where(and(eq(problems.userId, userId), inArray(problems.id, uniqueProblemIds)));
  const rows = await db
    .select()
    .from(studyListItemProgress)
    .where(and(eq(studyListItemProgress.userId, userId), inArray(studyListItemProgress.problemId, uniqueProblemIds)));
  const lists = await loadStudyLists();
  const progressByProblemId = new Map<string, typeof rows>();

  for (const row of rows) {
    if (!row.problemId) continue;
    const progressRows = progressByProblemId.get(row.problemId) ?? [];
    progressRows.push(row);
    progressByProblemId.set(row.problemId, progressRows);
  }

  for (const problem of problemRows) {
    sourcesByProblemId.set(
      problem.id,
      getProblemSourcesFromStudyLists(problem.titleSlug, lists, progressByProblemId.get(problem.id) ?? []),
    );
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

async function getUserProblemsByTitleSlug(userId: string, titleSlugs: string[], client: DbClient = db) {
  const uniqueSlugs = [...new Set(titleSlugs.filter(Boolean))];
  if (uniqueSlugs.length === 0) return new Map<string, Problem>();

  const rows = await client
    .select()
    .from(problems)
    .where(and(eq(problems.userId, userId), inArray(problems.titleSlug, uniqueSlugs)));
  return new Map(rows.filter((problem) => problem.titleSlug).map((problem) => [problem.titleSlug!, problem as Problem]));
}

async function getProgressRows(userId: string, studyListSlug?: string, client: DbClient = db) {
  if (studyListSlug) {
    return client
      .select()
      .from(studyListItemProgress)
      .where(and(eq(studyListItemProgress.userId, userId), eq(studyListItemProgress.studyListSlug, studyListSlug)));
  }

  return client.select().from(studyListItemProgress).where(eq(studyListItemProgress.userId, userId));
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
  options: { dailyNewCount?: number | null },
) {
  const list = await getStudyList(studyListSlug);
  if (!list) return null;

  await db.transaction(async (tx) => {
    await startStudyListWithClient(tx, userId, list, options);
  });

  return getStudyListDetail(userId, studyListSlug);
}

async function startStudyListWithClient(
  client: DbClient,
  userId: string,
  list: StudyListSnapshot,
  options: { dailyNewCount?: number | null },
) {
  const now = nowIso();
  const dailyNewCount = normalizeDailyNewCount(options.dailyNewCount);

  await client
    .insert(studyListEnrollments)
    .values({
      id: uuidv4(),
      userId,
      studyListSlug: list.slug,
      dailyNewCount,
      active: 1,
      lastQueuedOn: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [studyListEnrollments.userId, studyListEnrollments.studyListSlug],
      set: { dailyNewCount, active: 1, updatedAt: now },
    });

  await ensureStudyListProgressRows(userId, list, client);
  const [enrollment] = await client
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.studyListSlug, list.slug)))
    .limit(1);

  if (enrollment?.lastQueuedOn !== getToday()) {
    await queueNextStudyListItemsWithClient(client, userId, list, { markDailyQueuedOn: true });
  }
}

async function ensureStudyListProgressRows(userId: string, list: StudyListSnapshot, client: DbClient = db) {
  if (list.items.length === 0) return;
  const now = nowIso();

  await client
    .insert(studyListItemProgress)
    .values(list.items.map((item) => ({
      id: uuidv4(),
      userId,
      studyListSlug: list.slug,
      titleSlug: item.titleSlug,
      problemId: null,
      order: item.order,
      mode: "follow_existing",
      status: "not_started",
      learnedAt: null,
      createdAt: now,
      updatedAt: now,
    })))
    .onConflictDoNothing();
}

async function ensureProblemForStudyItem(userId: string, titleSlug: string, client: DbClient = db) {
  const [existing] = await client
    .select()
    .from(problems)
    .where(and(eq(problems.userId, userId), eq(problems.titleSlug, titleSlug)))
    .limit(1);
  if (existing) return existing as Problem;

  const question = await getLeetcodeQuestionBySlug(titleSlug);
  if (!question) return null;

  const now = nowIso();
  const [created] = await client
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
    .onConflictDoNothing()
    .returning();

  if (created) return created as Problem;

  const [afterConflict] = await client
    .select()
    .from(problems)
    .where(and(eq(problems.userId, userId), eq(problems.titleSlug, titleSlug)))
    .limit(1);
  return afterConflict ? afterConflict as Problem : null;
}

export async function startStudyListItem(userId: string, studyListSlug: string, titleSlug: string) {
  const list = await getStudyList(studyListSlug);
  const item = list?.items.find((candidate) => candidate.titleSlug === titleSlug);
  if (!list || !item) return null;

  return db.transaction(async (tx) => {
    await ensureStudyListProgressRows(userId, list, tx);
    const problem = await ensureProblemForStudyItem(userId, titleSlug, tx);
    if (!problem) return null;

    const status = queuedStudyStatus(problem);
    await tx
      .update(studyListItemProgress)
      .set({ problemId: problem.id, mode: "follow_existing", status, updatedAt: nowIso() })
      .where(
        and(
          eq(studyListItemProgress.userId, userId),
          eq(studyListItemProgress.studyListSlug, studyListSlug),
          eq(studyListItemProgress.titleSlug, titleSlug),
        ),
      );

    return problem;
  });
}

export async function queueNextStudyListItems(
  userId: string,
  studyListSlug: string,
  options: { limit?: number | null; markDailyQueuedOn?: boolean; today?: string } = {},
): Promise<StudyListQueueResult | null> {
  const list = await getStudyList(studyListSlug);
  if (!list) return null;

  return db.transaction((tx) => queueNextStudyListItemsWithClient(tx, userId, list, options));
}

async function queueNextStudyListItemsWithClient(
  client: DbClient,
  userId: string,
  list: StudyListSnapshot,
  options: { limit?: number | null; markDailyQueuedOn?: boolean; today?: string } = {},
): Promise<StudyListQueueResult | null> {
  const [enrollment] = await client
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.studyListSlug, list.slug), eq(studyListEnrollments.active, 1)))
    .limit(1);
  if (!enrollment) return null;

  await ensureStudyListProgressRows(userId, list, client);
  const limit = normalizeDailyNewCount(options.limit ?? enrollment.dailyNewCount);
  const progressRows = (await getProgressRows(userId, list.slug, client)).sort((a, b) => a.order - b.order);
  const candidates = selectStudyListQueueBatch(progressRows, limit);
  const problemBySlug = await getUserProblemsByTitleSlug(
    userId,
    candidates.map((row) => row.titleSlug),
    client,
  );
  const now = nowIso();
  let queued = 0;
  let skipped = 0;

  for (const row of candidates) {
    let problem = problemBySlug.get(row.titleSlug) ?? null;

    if (problem) {
      skipped += 1;
    } else {
      problem = await ensureProblemForStudyItem(userId, row.titleSlug, client);
      if (problem) queued += 1;
    }

    if (!problem) continue;
    const status = queuedStudyStatus(problem);
    await client
      .update(studyListItemProgress)
      .set({
        problemId: problem.id,
        mode: "follow_existing",
        status,
        learnedAt: progressLearnedAt(status, problem, now),
        updatedAt: now,
      })
      .where(eq(studyListItemProgress.id, row.id));
  }

  if (options.markDailyQueuedOn) {
    await client
      .update(studyListEnrollments)
      .set({ lastQueuedOn: options.today ?? getToday(), updatedAt: now })
      .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.studyListSlug, list.slug)));
  }
  const remainingRows = await getProgressRows(userId, list.slug, client);

  return {
    slug: list.slug,
    title: list.title,
    dailyNewCount: enrollment.dailyNewCount,
    queued,
    skipped,
    remaining: remainingRows.filter((row) => row.status === "not_started").length,
  };
}

export async function markStudyListProgressReviewed(
  userId: string,
  problem: Problem,
  context?: { studyListSlug?: string | null; titleSlug?: string | null },
  client: DbClient = db,
) {
  const titleSlug = context?.titleSlug || problem.titleSlug;
  if (!titleSlug) return;

  const now = nowIso();
  const rows = await client
    .select()
    .from(studyListItemProgress)
    .where(and(eq(studyListItemProgress.userId, userId), eq(studyListItemProgress.titleSlug, titleSlug)));

  for (const row of rows) {
    const isExplicitContext = context?.studyListSlug === row.studyListSlug;
    const isSamePlannedProblem = row.problemId === problem.id && (row.status === "planned" || row.status === "not_started");
    const shouldUpdate = isExplicitContext || row.mode === "follow_existing" || isSamePlannedProblem;
    if (!shouldUpdate) continue;

    await client
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

export async function getStudyListDetail(userId: string, studyListSlug: string, timer?: RequestPerformanceTimer): Promise<StudyListDetail | null> {
  const list = await measurePerformanceStage(timer, "getStudyList", "io_cpu", () => getStudyList(studyListSlug));
  if (!list) return null;

  const [enrollment] = await measurePerformanceStage(timer, "enrollmentQuery", "db", () => db
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.studyListSlug, studyListSlug)))
    .limit(1));
  const progressRows = await measurePerformanceStage(timer, "progressQuery", "db", () => getProgressRows(userId, studyListSlug));
  const progressBySlug = new Map(progressRows.map((row) => [row.titleSlug, row]));
  const questionBySlug = await measurePerformanceStage(timer, "leetcodeQuestionMap", "io_cpu", () => getLeetcodeQuestionMapBySlug());
  const problemBySlug = await measurePerformanceStage(timer, "userProblemsQuery", "db", () => getUserProblemsByTitleSlug(userId, list.items.map((item) => item.titleSlug)));
  const sourcesByProblemId = await measurePerformanceStage(timer, "problemSourcesQuery", "db", () => getProblemSources(
    userId,
    [...problemBySlug.values()].map((problem) => problem.id),
  ));

  const items = await measurePerformanceStage(timer, "buildItems", "app", () => list.items.map((item) => {
    const question = questionBySlug.get(item.titleSlug) as LeetcodeQuestion | undefined;
    const progress = progressBySlug.get(item.titleSlug);
    const problem = progress?.problemId
      ? [...problemBySlug.values()].find((candidate) => candidate.id === progress.problemId) ?? null
      : problemBySlug.get(item.titleSlug) ?? null;
    const mode = progress?.mode ?? "follow_existing";
    const status = progress?.status ?? legacyProblemStudyStatus(problem, mode);

    return {
      ...question!,
      order: item.order,
      enrolled: Boolean(enrollment),
      problem,
      status,
      mode,
      sources: problem ? sourcesByProblemId.get(problem.id) ?? [{ kind: "manual", studyListSlug: null, title: "手动加入" }] : [],
    };
  }) satisfies StudyListQuestion[]);
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

async function getStudyListQueueOptions(userId: string): Promise<StudyListQueueOption[]> {
  const enrollments = await db
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.active, 1)));
  const lists = await loadStudyLists();
  const listBySlug = new Map(lists.map((list) => [list.slug, list]));
  const options: StudyListQueueOption[] = [];

  for (const enrollment of enrollments) {
    const list = listBySlug.get(enrollment.studyListSlug);
    if (!list) continue;
    if (enrollment.dailyNewCount <= 0) continue;
    await ensureStudyListProgressRows(userId, list);
    const progressRows = await getProgressRows(userId, enrollment.studyListSlug);
    const remaining = progressRows.filter((row) => row.status === "not_started").length;
    if (remaining <= 0) continue;
    options.push({
      slug: list.slug,
      title: list.title,
      dailyNewCount: enrollment.dailyNewCount,
      remaining,
    });
  }

  return options;
}

export async function getTodayStudyPlan(userId: string): Promise<TodayStudyPlan> {
  const today = getToday();
  const enrollments = await db
    .select()
    .from(studyListEnrollments)
    .where(and(eq(studyListEnrollments.userId, userId), eq(studyListEnrollments.active, 1)));

  for (const enrollment of enrollments) {
    if (enrollment.lastQueuedOn === today) continue;
    await queueNextStudyListItems(userId, enrollment.studyListSlug, {
      limit: enrollment.dailyNewCount,
      markDailyQueuedOn: true,
      today,
    });
  }

  const allProblems = (await db
    .select()
    .from(problems)
    .where(eq(problems.userId, userId))) as Problem[];
  const dueProblems = allProblems.filter((problem) => isDue(problem, today));
  const dueWithSources = await attachProblemSources(userId, dueProblems);

  return {
    today,
    dueProblems: dueWithSources,
    extraStudyLists: await getStudyListQueueOptions(userId),
    totals: {
      problems: allProblems.length,
      mastered: allProblems.filter((problem) => problem.status === "mastered").length,
      due: dueWithSources.length,
    },
  };
}
