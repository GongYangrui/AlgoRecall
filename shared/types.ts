export const problemDifficulties = ["easy", "medium", "hard"] as const;
export const problemStatuses = ["new", "learning", "reviewing", "mastered"] as const;
export const reviewResults = ["easy", "hard", "solution", "mastered"] as const;

export type Difficulty = (typeof problemDifficulties)[number];
export type ProblemStatus = (typeof problemStatuses)[number];
export type ReviewResult = (typeof reviewResults)[number];

export type Problem = {
  id: string;
  userId: string;
  title: string;
  titleCn: string | null;
  titleSlug: string | null;
  frontendId: string | null;
  tagsCn: string | null;
  url: string;
  urlEn: string | null;
  urlCn: string | null;
  platform: string;
  difficulty: Difficulty | string;
  tags: string | null;
  status: ProblemStatus | string;
  stage: number;
  lastResult: ReviewResult | string | null;
  wrongCount: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  sources?: ProblemSource[];
};

export type Review = {
  id: string;
  userId: string;
  problemId: string;
  reviewedAt: string;
  result: ReviewResult;
  previousStage: number;
  nextStage: number;
  nextReviewAt: string | null;
  note: string | null;
};

export type LeetcodeQuestion = {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  titleCn: string | null;
  difficulty: Difficulty | string;
  content?: string | null;
  contentCn?: string | null;
  tags: string[] | string | null;
  tagsCn: string[] | string | null;
  urlEn: string;
  urlCn: string;
};

export type LeetcodeSearchResult = LeetcodeQuestion & {
  imported: boolean;
  problemId: string | null;
};

export type StudyListMode = "follow_existing" | "restart_in_list";
export type StudyListItemStatus = "not_started" | "planned" | "learned" | "covered" | "mastered";

export type ProblemSource = {
  studyListSlug: string | null;
  title: string;
  kind: "manual" | "study_list";
  status?: StudyListItemStatus | string;
  mode?: StudyListMode | string;
};

export type StudyListItemSnapshot = {
  order: number;
  titleSlug: string;
};

export type StudyListSnapshot = {
  slug: string;
  title: string;
  description: string;
  sourceUrl: string;
  locale: "cn" | "en";
  items: StudyListItemSnapshot[];
};

export type StudyListSummary = {
  slug: string;
  title: string;
  description: string;
  sourceUrl: string;
  locale: "cn" | "en";
  total: number;
  enrolled: boolean;
  dailyNewCount: number | null;
  active: boolean;
  completed: number;
  percent: number;
};

export type StudyListQueueOption = {
  slug: string;
  title: string;
  dailyNewCount: number;
  remaining: number;
};

export type StudyListQueueResult = StudyListQueueOption & {
  queued: number;
  skipped: number;
};

export type StudyListQuestion = LeetcodeQuestion & {
  order: number;
  enrolled: boolean;
  problem: Problem | null;
  status: StudyListItemStatus | string;
  mode: StudyListMode | string;
  sources: ProblemSource[];
};

export type StudyListDetail = StudyListSummary & {
  items: StudyListQuestion[];
};

export type TodayStudyPlan = {
  today: string;
  dueProblems: Problem[];
  extraStudyLists: StudyListQueueOption[];
  totals: {
    problems: number;
    mastered: number;
    due: number;
  };
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReviewHeatmapDay = {
  date: string;
  count: number;
};

export type ReviewTrendDay = {
  date: string;
  total: number;
  easy: number;
  hard: number;
  solution: number;
  mastered: number;
};

export type StageDistributionBucket = {
  stage: number;
  count: number;
};

export type WeakTag = {
  tag: string;
  score: number;
  count: number;
};

export type StatsSummary = {
  total: number;
  due: number;
  mastered: number;
  learning: number;
  reviewing: number;
  newCount: number;
  masteryRate: number;
  byDifficulty: Record<string, number>;
  byResult: Record<ReviewResult, number>;
  reviewHeatmap: ReviewHeatmapDay[];
  reviewTrend30d: ReviewTrendDay[];
  stageDistribution: StageDistributionBucket[];
  weakTags: WeakTag[];
  attention: Problem[];
};
