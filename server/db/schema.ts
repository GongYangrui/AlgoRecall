import { index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const problems = pgTable(
  "problems",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    titleCn: text("title_cn"),
    titleSlug: text("title_slug"),
    frontendId: text("frontend_id"),
    tagsCn: text("tags_cn"),
    url: text("url").notNull(),
    urlEn: text("url_en"),
    urlCn: text("url_cn"),
    platform: text("platform").notNull().default("leetcode"),
    difficulty: text("difficulty").notNull().default("medium"),
    tags: text("tags"),
    status: text("status").notNull().default("new"),
    stage: integer("stage").notNull().default(0),
    lastResult: text("last_result"),
    wrongCount: integer("wrong_count").notNull().default(0),
    nextReviewAt: text("next_review_at"),
    lastReviewedAt: text("last_reviewed_at"),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("uq_problems_user_frontend").on(table.userId, table.frontendId),
    uniqueIndex("uq_problems_user_title_slug").on(table.userId, table.titleSlug),
    index("idx_problems_user_title_slug").on(table.userId, table.titleSlug),
    index("idx_problems_user_next_review").on(table.userId, table.nextReviewAt, table.createdAt),
    index("idx_problems_user_status").on(table.userId, table.status),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    problemId: text("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    reviewedAt: text("reviewed_at").notNull(),
    result: text("result").notNull(),
    previousStage: integer("previous_stage").notNull(),
    nextStage: integer("next_stage").notNull(),
    nextReviewAt: text("next_review_at"),
    note: text("note"),
  },
  (table) => [
    index("idx_reviews_user_reviewed").on(table.userId, table.reviewedAt),
    index("idx_reviews_user_problem").on(table.userId, table.problemId, table.reviewedAt),
  ],
);

export const leetcodeQuestions = pgTable(
  "leetcode_questions",
  {
    titleSlug: text("title_slug").primaryKey(),
    questionFrontendId: text("question_frontend_id").notNull(),
    title: text("title").notNull(),
    titleCn: text("title_cn"),
    difficulty: text("difficulty").notNull(),
    tags: text("tags"),
    tagsCn: text("tags_cn"),
    urlEn: text("url_en").notNull(),
    urlCn: text("url_cn").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_leetcode_frontend_id").on(table.questionFrontendId),
    index("idx_leetcode_title").on(table.title),
    index("idx_leetcode_title_cn").on(table.titleCn),
  ],
);

export const studyListEnrollments = pgTable(
  "study_list_enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    studyListSlug: text("study_list_slug").notNull(),
    dailyNewCount: integer("daily_new_count").notNull().default(2),
    active: integer("active").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("uq_study_list_enrollments_user_slug").on(table.userId, table.studyListSlug),
    index("idx_study_list_enrollments_user_active").on(table.userId, table.active),
  ],
);

export const studyListItemProgress = pgTable(
  "study_list_item_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    studyListSlug: text("study_list_slug").notNull(),
    titleSlug: text("title_slug").notNull(),
    problemId: text("problem_id").references(() => problems.id, { onDelete: "set null" }),
    order: integer("order").notNull(),
    mode: text("mode").notNull().default("follow_existing"),
    status: text("status").notNull().default("not_started"),
    learnedAt: text("learned_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("uq_study_list_item_progress_user_list_slug").on(table.userId, table.studyListSlug, table.titleSlug),
    index("idx_study_list_item_progress_user_problem").on(table.userId, table.problemId),
    index("idx_study_list_item_progress_user_status").on(table.userId, table.status),
  ],
);

export const appEvents = pgTable(
  "app_events",
  {
    id: text("id").primaryKey(),
    timestamp: text("timestamp").notNull(),
    level: text("level").notNull(),
    event: text("event").notNull(),
    message: text("message").notNull(),
    errorName: text("error_name"),
    errorStack: text("error_stack"),
    errorCause: text("error_cause"),
    requestId: text("request_id"),
    userId: text("user_id"),
    method: text("method"),
    route: text("route"),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms"),
    metadata: text("metadata").default("{}"),
  },
  (table) => [
    index("idx_app_events_timestamp").on(table.timestamp),
    index("idx_app_events_level").on(table.level),
    index("idx_app_events_request_id").on(table.requestId),
    index("idx_app_events_event").on(table.event),
  ],
);

export type ProblemRow = typeof problems.$inferSelect;
export type NewProblemRow = typeof problems.$inferInsert;
export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
export type LeetcodeQuestionRow = typeof leetcodeQuestions.$inferSelect;
export type StudyListEnrollmentRow = typeof studyListEnrollments.$inferSelect;
export type NewStudyListEnrollmentRow = typeof studyListEnrollments.$inferInsert;
export type StudyListItemProgressRow = typeof studyListItemProgress.$inferSelect;
export type NewStudyListItemProgressRow = typeof studyListItemProgress.$inferInsert;
export type AppEventRow = typeof appEvents.$inferSelect;
export type NewAppEventRow = typeof appEvents.$inferInsert;
