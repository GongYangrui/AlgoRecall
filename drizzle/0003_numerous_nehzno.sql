CREATE TABLE "study_list_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"study_list_slug" text NOT NULL,
	"daily_new_count" integer DEFAULT 2 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_list_item_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"study_list_slug" text NOT NULL,
	"title_slug" text NOT NULL,
	"problem_id" text,
	"order" integer NOT NULL,
	"mode" text DEFAULT 'follow_existing' NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"learned_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "title_slug" text;--> statement-breakpoint
UPDATE "problems"
SET "title_slug" = "leetcode_questions"."title_slug"
FROM "leetcode_questions"
WHERE "problems"."title_slug" IS NULL
	AND "problems"."frontend_id" = "leetcode_questions"."question_frontend_id";--> statement-breakpoint
ALTER TABLE "study_list_enrollments" ADD CONSTRAINT "study_list_enrollments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ADD CONSTRAINT "study_list_item_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_list_item_progress" ADD CONSTRAINT "study_list_item_progress_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_study_list_enrollments_user_slug" ON "study_list_enrollments" USING btree ("user_id","study_list_slug");--> statement-breakpoint
CREATE INDEX "idx_study_list_enrollments_user_active" ON "study_list_enrollments" USING btree ("user_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_study_list_item_progress_user_list_slug" ON "study_list_item_progress" USING btree ("user_id","study_list_slug","title_slug");--> statement-breakpoint
CREATE INDEX "idx_study_list_item_progress_user_problem" ON "study_list_item_progress" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "idx_study_list_item_progress_user_status" ON "study_list_item_progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_problems_user_title_slug" ON "problems" USING btree ("user_id","title_slug");--> statement-breakpoint
CREATE INDEX "idx_problems_user_title_slug" ON "problems" USING btree ("user_id","title_slug");
