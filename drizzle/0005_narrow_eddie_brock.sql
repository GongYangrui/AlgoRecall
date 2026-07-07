ALTER TABLE "app_events" ADD COLUMN "source" text DEFAULT 'server' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_events" ADD COLUMN "app_version" text DEFAULT 'dev' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_events" ADD COLUMN "environment" text DEFAULT 'development' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_app_events_source" ON "app_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_app_events_app_version" ON "app_events" USING btree ("app_version");--> statement-breakpoint
CREATE INDEX "idx_app_events_status_code" ON "app_events" USING btree ("status_code");