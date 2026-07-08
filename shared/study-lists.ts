import type { ProblemSource, StudyListSnapshot } from "./types";

export const STUDY_LIST_DEFAULT_DAILY_NEW = 2;
export const STUDY_LIST_REVIEW_PRESSURE_LIMIT = 8;

export const studyListModes = ["follow_existing", "restart_in_list"] as const;
export const studyListItemStatuses = ["not_started", "planned", "learned", "covered", "mastered"] as const;

export type StudyListMode = (typeof studyListModes)[number];
export type StudyListItemStatus = (typeof studyListItemStatuses)[number];

export function studyListModeLabel(mode: string) {
  const labels: Record<string, string> = {
    follow_existing: "依照原进度",
    restart_in_list: "重新加入",
  };
  return labels[mode] ?? mode;
}

export function studyListItemStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "未开始",
    planned: "已入队",
    learned: "已复习",
    covered: "已入队",
    mastered: "已掌握",
  };
  return labels[status] ?? status;
}

export function isCoveredStudyListStatus(status: string) {
  return status !== "not_started";
}

export function inferStudyListStatusFromProblem(
  problem: { status: string; reviewCount: number } | null | undefined,
  mode: string = "follow_existing",
): StudyListItemStatus {
  if (!problem) return "not_started";
  if (mode === "restart_in_list") return "not_started";
  if (problem.status === "mastered") return "mastered";
  if (problem.reviewCount > 0 || problem.status !== "new") return "covered";
  return "not_started";
}

export function calculateStudyListProgress(items: Array<{ status: string }>) {
  const total = items.length;
  const completed = items.filter((item) => isCoveredStudyListStatus(item.status)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percent };
}

export function selectStudyListQueueBatch<T extends { status: string; order: number }>(items: T[], limit: number): T[] {
  const size = Math.max(0, Math.trunc(limit));
  return items
    .filter((item) => item.status === "not_started")
    .toSorted((a, b) => a.order - b.order)
    .slice(0, size);
}

export type StudyListSourceProgress = {
  studyListSlug: string;
  status?: string;
  mode?: string;
};

export function getProblemSourcesFromStudyLists(
  titleSlug: string | null | undefined,
  lists: StudyListSnapshot[],
  progressRows: StudyListSourceProgress[] = [],
): ProblemSource[] {
  const titleBySlug = new Map(lists.map((list) => [list.slug, list.title]));
  const sourcesBySlug = new Map<string, ProblemSource>();

  if (titleSlug) {
    for (const list of lists) {
      if (!list.items.some((item) => item.titleSlug === titleSlug)) continue;
      sourcesBySlug.set(list.slug, {
        kind: "study_list",
        studyListSlug: list.slug,
        title: list.title,
      });
    }
  }

  for (const progress of progressRows) {
    const existing = sourcesBySlug.get(progress.studyListSlug);
    sourcesBySlug.set(progress.studyListSlug, {
      kind: "study_list",
      studyListSlug: progress.studyListSlug,
      title: existing?.title ?? titleBySlug.get(progress.studyListSlug) ?? progress.studyListSlug,
      status: progress.status,
      mode: progress.mode,
    });
  }

  const sources = [...sourcesBySlug.values()];
  return sources.length > 0 ? sources : [{ kind: "manual", studyListSlug: null, title: "手动加入" }];
}
