CREATE TABLE "app_events" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"level" text NOT NULL,
	"event" text NOT NULL,
	"message" text NOT NULL,
	"error_name" text,
	"error_stack" text,
	"error_cause" text,
	"request_id" text,
	"user_id" text,
	"method" text,
	"route" text,
	"status_code" integer,
	"duration_ms" integer,
	"metadata" text DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX "idx_app_events_timestamp" ON "app_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_app_events_level" ON "app_events" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_app_events_request_id" ON "app_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_app_events_event" ON "app_events" USING btree ("event");