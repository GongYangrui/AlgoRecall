CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"user_id" text NOT NULL,
	"event" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"route" text,
	"metadata" text DEFAULT '{}'
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analytics_events_timestamp" ON "analytics_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_user_timestamp" ON "analytics_events" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_event_timestamp" ON "analytics_events" USING btree ("event","timestamp");