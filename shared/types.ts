export type Difficulty = "easy" | "medium" | "hard";
export type ProblemStatus = "new" | "learning" | "reviewing" | "mastered";
export type ReviewResult = "easy" | "hard" | "solution" | "mastered";

export type Problem = {
  id: string;
  userId: string;
  title: string;
  titleCn: string | null;
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
