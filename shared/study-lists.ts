export const STUDY_LIST_DEFAULT_DAILY_NEW = 2;
export const STUDY_LIST_REVIEW_PRESSURE_LIMIT = 8;

export const studyListModes = ["follow_existing", "restart_in_list"] as const;
export const studyListItemStatuses = ["not_started", "planned", "learned", "covered", "mastered"] as const;

export type StudyListMode = (typeof studyListModes)[number];
export type StudyListItemStatus = (typeof studyListItemStatuses)[number];

export function studyListModeLabel(mode: string) {
  const labels: Record<string, string> = {
    follow_existing: "依照原进度",
    restart_in_list: "题单内重学",
  };
  return labels[mode] ?? mode;
}

export function studyListItemStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "未开始",
    planned: "今日新题",
    learned: "已学习",
    covered: "已覆盖",
    mastered: "已掌握",
  };
  return labels[status] ?? status;
}

export function isCoveredStudyListStatus(status: string) {
  return status === "learned" || status === "covered" || status === "mastered";
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
