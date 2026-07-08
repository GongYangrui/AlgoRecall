CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_problems_search_trgm" ON "problems" USING gin (lower(concat_ws(' ', "title", "frontend_id", "tags", "url", "title_cn", "url_en", "url_cn")) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_problems_user_due_active" ON "problems" USING btree ("user_id", "next_review_at", "created_at") WHERE "status" <> 'mastered';
