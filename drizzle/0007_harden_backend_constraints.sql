UPDATE "problems" SET "difficulty" = 'medium' WHERE "difficulty" NOT IN ('easy', 'medium', 'hard');--> statement-breakpoint
UPDATE "problems" SET "status" = 'new' WHERE "status" NOT IN ('new', 'learning', 'reviewing', 'mastered');--> statement-breakpoint
UPDATE "problems" SET "last_result" = NULL WHERE "last_result" IS NOT NULL AND "last_result" NOT IN ('easy', 'hard', 'solution', 'mastered');--> statement-breakpoint
UPDATE "problems" SET "stage" = LEAST(6, GREATEST(0, "stage"));--> statement-breakpoint
UPDATE "problems" SET "wrong_count" = 0 WHERE "wrong_count" < 0;--> statement-breakpoint
UPDATE "problems" SET "review_count" = 0 WHERE "review_count" < 0;--> statement-breakpoint
UPDATE "reviews" SET "result" = 'hard' WHERE "result" NOT IN ('easy', 'hard', 'solution', 'mastered');--> statement-breakpoint
UPDATE "reviews" SET "previous_stage" = LEAST(6, GREATEST(0, "previous_stage"));--> statement-breakpoint
UPDATE "reviews" SET "next_stage" = LEAST(6, GREATEST(0, "next_stage"));--> statement-breakpoint
UPDATE "leetcode_questions" SET "difficulty" = 'medium' WHERE "difficulty" NOT IN ('easy', 'medium', 'hard');--> statement-breakpoint
UPDATE "study_list_enrollments" SET "daily_new_count" = LEAST(20, GREATEST(0, "daily_new_count"));--> statement-breakpoint
UPDATE "study_list_enrollments" SET "active" = 1 WHERE "active" NOT IN (0, 1);--> statement-breakpoint
UPDATE "study_list_item_progress" SET "mode" = 'follow_existing' WHERE "mode" NOT IN ('follow_existing', 'restart_in_list');--> statement-breakpoint
UPDATE "study_list_item_progress" SET "status" = 'not_started' WHERE "status" NOT IN ('not_started', 'planned', 'learned', 'covered', 'mastered');--> statement-breakpoint
UPDATE "study_list_item_progress" SET "order" = 0 WHERE "order" < 0;--> statement-breakpoint
UPDATE "app_events" SET "level" = 'info' WHERE "level" NOT IN ('error', 'warn', 'info', 'audit');--> statement-breakpoint
UPDATE "app_events" SET "source" = 'server' WHERE "source" NOT IN ('server', 'client', 'system');--> statement-breakpoint
UPDATE "app_events" SET "status_code" = NULL WHERE "status_code" IS NOT NULL AND ("status_code" < 100 OR "status_code" > 599);--> statement-breakpoint
UPDATE "app_events" SET "duration_ms" = NULL WHERE "duration_ms" IS NOT NULL AND "duration_ms" < 0;--> statement-breakpoint
UPDATE "user" SET "role" = 'user' WHERE "role" NOT IN ('user', 'admin');--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "chk_problems_difficulty" CHECK ("difficulty" IN ('easy', 'medium', 'hard'));--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "chk_problems_status" CHECK ("status" IN ('new', 'learning', 'reviewing', 'mastered'));--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "chk_problems_last_result" CHECK ("last_result" IS NULL OR "last_result" IN ('easy', 'hard', 'solution', 'mastered'));--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "chk_problems_stage_range" CHECK ("stage" >= 0 AND "stage" <= 6);--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "chk_problems_wrong_count_nonnegative" CHECK ("wrong_count" >= 0);--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "chk_problems_review_count_nonnegative" CHECK ("review_count" >= 0);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "chk_reviews_result" CHECK ("result" IN ('easy', 'hard', 'solution', 'mastered'));--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "chk_reviews_previous_stage_range" CHECK ("previous_stage" >= 0 AND "previous_stage" <= 6);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "chk_reviews_next_stage_range" CHECK ("next_stage" >= 0 AND "next_stage" <= 6);--> statement-breakpoint
ALTER TABLE "leetcode_questions" ADD CONSTRAINT "chk_leetcode_questions_difficulty" CHECK ("difficulty" IN ('easy', 'medium', 'hard'));--> statement-breakpoint
ALTER TABLE "study_list_enrollments" ADD CONSTRAINT "chk_study_list_enrollments_daily_new_count" CHECK ("daily_new_count" >= 0 AND "daily_new_count" <= 20);--> statement-breakpoint
ALTER TABLE "study_list_enrollments" ADD CONSTRAINT "chk_study_list_enrollments_active" CHECK ("active" IN (0, 1));--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ADD CONSTRAINT "chk_study_list_item_progress_mode" CHECK ("mode" IN ('follow_existing', 'restart_in_list'));--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ADD CONSTRAINT "chk_study_list_item_progress_status" CHECK ("status" IN ('not_started', 'planned', 'learned', 'covered', 'mastered'));--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ADD CONSTRAINT "chk_study_list_item_progress_order_nonnegative" CHECK ("order" >= 0);--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "chk_app_events_level" CHECK ("level" IN ('error', 'warn', 'info', 'audit'));--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "chk_app_events_source" CHECK ("source" IN ('server', 'client', 'system'));--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "chk_app_events_status_code" CHECK ("status_code" IS NULL OR ("status_code" >= 100 AND "status_code" <= 599));--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "chk_app_events_duration_nonnegative" CHECK ("duration_ms" IS NULL OR "duration_ms" >= 0);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "chk_user_role" CHECK ("role" IN ('user', 'admin'));
