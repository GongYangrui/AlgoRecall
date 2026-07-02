CREATE TABLE "leetcode_questions" (
	"title_slug" text PRIMARY KEY NOT NULL,
	"question_frontend_id" text NOT NULL,
	"title" text NOT NULL,
	"title_cn" text,
	"difficulty" text NOT NULL,
	"tags" text,
	"tags_cn" text,
	"url_en" text NOT NULL,
	"url_cn" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"title_cn" text,
	"frontend_id" text,
	"tags_cn" text,
	"url" text NOT NULL,
	"url_en" text,
	"url_cn" text,
	"platform" text DEFAULT 'leetcode' NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"tags" text,
	"status" text DEFAULT 'new' NOT NULL,
	"stage" integer DEFAULT 0 NOT NULL,
	"last_result" text,
	"wrong_count" integer DEFAULT 0 NOT NULL,
	"next_review_at" text,
	"last_reviewed_at" text,
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"reviewed_at" text NOT NULL,
	"result" text NOT NULL,
	"previous_stage" integer NOT NULL,
	"next_stage" integer NOT NULL,
	"next_review_at" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_leetcode_frontend_id" ON "leetcode_questions" USING btree ("question_frontend_id");--> statement-breakpoint
CREATE INDEX "idx_leetcode_title" ON "leetcode_questions" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_leetcode_title_cn" ON "leetcode_questions" USING btree ("title_cn");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_problems_user_frontend" ON "problems" USING btree ("user_id","frontend_id");--> statement-breakpoint
CREATE INDEX "idx_problems_user_next_review" ON "problems" USING btree ("user_id","next_review_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_problems_user_status" ON "problems" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_reviews_user_reviewed" ON "reviews" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "idx_reviews_user_problem" ON "reviews" USING btree ("user_id","problem_id","reviewed_at");