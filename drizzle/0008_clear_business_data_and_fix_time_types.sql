TRUNCATE TABLE
  "reviews",
  "study_list_item_progress",
  "study_list_enrollments",
  "problems",
  "app_events",
  "analytics_events"
RESTART IDENTITY CASCADE;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "next_review_at" TYPE date USING NULLIF("next_review_at", '')::date;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "last_reviewed_at" TYPE timestamp with time zone USING NULLIF("last_reviewed_at", '')::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "created_at" TYPE timestamp with time zone USING COALESCE(NULLIF("created_at", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING COALESCE(NULLIF("updated_at", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "reviewed_at" TYPE timestamp with time zone USING COALESCE(NULLIF("reviewed_at", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "next_review_at" TYPE date USING NULLIF("next_review_at", '')::date;--> statement-breakpoint
ALTER TABLE "leetcode_questions" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING now();--> statement-breakpoint
ALTER TABLE "study_list_enrollments" ALTER COLUMN "last_queued_on" TYPE date USING NULLIF("last_queued_on", '')::date;--> statement-breakpoint
ALTER TABLE "study_list_enrollments" ALTER COLUMN "created_at" TYPE timestamp with time zone USING COALESCE(NULLIF("created_at", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "study_list_enrollments" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING COALESCE(NULLIF("updated_at", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ALTER COLUMN "learned_at" TYPE timestamp with time zone USING NULLIF("learned_at", '')::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ALTER COLUMN "created_at" TYPE timestamp with time zone USING COALESCE(NULLIF("created_at", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING COALESCE(NULLIF("updated_at", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "app_events" ALTER COLUMN "timestamp" TYPE timestamp with time zone USING COALESCE(NULLIF("timestamp", '')::timestamp with time zone, now());--> statement-breakpoint
ALTER TABLE "analytics_events" ALTER COLUMN "timestamp" TYPE timestamp with time zone USING COALESCE(NULLIF("timestamp", '')::timestamp with time zone, now());
