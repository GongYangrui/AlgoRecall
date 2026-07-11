ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_reviews_user_idempotency_key" ON "reviews" ("user_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_study_list_item_progress_user_list_status_order" ON "study_list_item_progress" ("user_id", "study_list_slug", "status", "order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_app_events_level_timestamp" ON "app_events" ("level", "timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leetcode_questions_search_trgm" ON "leetcode_questions" USING gin (lower(coalesce("question_frontend_id", '') || ' ' || coalesce("title", '') || ' ' || coalesce("title_cn", '') || ' ' || coalesce("title_slug", '') || ' ' || coalesce("tags", '') || ' ' || coalesce("tags_cn", '')) gin_trgm_ops);
