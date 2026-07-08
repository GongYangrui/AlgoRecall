CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_problems_search_trgm" ON "problems" USING gin (lower(coalesce("title", '') || ' ' || coalesce("frontend_id", '') || ' ' || coalesce("tags", '') || ' ' || coalesce("url", '') || ' ' || coalesce("title_cn", '') || ' ' || coalesce("url_en", '') || ' ' || coalesce("url_cn", '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_problems_user_due_active" ON "problems" USING btree ("user_id", "next_review_at", "created_at") WHERE "status" <> 'mastered';
