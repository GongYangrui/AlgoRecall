import type { Problem, Review, ReviewResult } from "./types";

export const EXTENSION_TOKEN_PREFIX = "ar_ext_";
export const EXTENSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const EXTENSION_PAIRING_TTL_MS = 10 * 60 * 1000;
export const EXTENSION_PAIRING_POLL_INTERVAL_MS = 5_000;
export const EXTENSION_DEVICE_NAME_MAX_LENGTH = 80;

export type ExtensionPairingStatus = "pending" | "approved" | "denied" | "consumed" | "expired";

export function resolveExtensionPairingClaimStatus(
  status: Exclude<ExtensionPairingStatus, "expired">,
  expiresAt: string,
  now = Date.now(),
): ExtensionPairingStatus {
  if (Date.parse(expiresAt) <= now) return "expired";
  return status;
}

export type ExtensionPairingCreateResponse = {
  pairingId: string;
  pairingSecret: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: string;
  pollIntervalMs: number;
};

export type ExtensionPairingTokenResponse =
  | { status: "pending" }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "approved"; token: string; connectionId: string; expiresAt: string };

export type ExtensionProblemResponse = {
  question: {
    titleSlug: string;
    questionFrontendId: string;
    title: string;
    titleCn: string | null;
    difficulty: string;
  };
  problem: Problem | null;
  reviewedToday: boolean;
  latestReview: Review | null;
};

export type ExtensionTodayProblem = Pick<
  Problem,
  | "id"
  | "title"
  | "titleCn"
  | "titleSlug"
  | "frontendId"
  | "difficulty"
  | "status"
  | "stage"
  | "nextReviewAt"
  | "reviewCount"
> & { titleSlug: string };

export type ExtensionTodayStudyPlanResponse = {
  today: string;
  dueProblems: ExtensionTodayProblem[];
};

export function buildExtensionTodayProblems(problems: Problem[]): ExtensionTodayProblem[] {
  return problems.flatMap((problem) => {
    if (problem.platform !== "leetcode" || !problem.titleSlug) return [];
    return [{
      id: problem.id,
      title: problem.title,
      titleCn: problem.titleCn,
      titleSlug: problem.titleSlug,
      frontendId: problem.frontendId,
      difficulty: problem.difficulty,
      status: problem.status,
      stage: problem.stage,
      nextReviewAt: problem.nextReviewAt,
      reviewCount: problem.reviewCount,
    }];
  });
}

export type ExtensionReviewRequest = {
  titleSlug: string;
  result: ReviewResult;
  note?: string | null;
  idempotencyKey: string;
};

export type ExtensionReviewResponse = {
  review: Review;
  problem: Problem;
  createdProblem: boolean;
};

export type ExtensionConnection = {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
};
