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

export type ProblemRow = typeof problems.$inferSelect;
export type NewProblemRow = typeof problems.$inferInsert;
export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
export type LeetcodeQuestionRow = typeof leetcodeQuestions.$inferSelect;
