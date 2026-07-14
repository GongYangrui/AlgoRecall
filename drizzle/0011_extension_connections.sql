CREATE TABLE "extension_pairings" (
	"id" text PRIMARY KEY NOT NULL,
	"secret_hash" text NOT NULL,
	"user_code" text NOT NULL,
	"user_id" text,
	"device_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chk_extension_pairings_status" CHECK ("extension_pairings"."status" IN ('pending', 'approved', 'denied', 'consumed'))
);
--> statement-breakpoint
CREATE TABLE "extension_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"device_name" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extension_pairings" ADD CONSTRAINT "extension_pairings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "extension_connections" ADD CONSTRAINT "extension_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_extension_pairings_user_code" ON "extension_pairings" USING btree ("user_code");
--> statement-breakpoint
CREATE INDEX "idx_extension_pairings_expires_at" ON "extension_pairings" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "idx_extension_pairings_user_id" ON "extension_pairings" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_extension_connections_token_hash" ON "extension_connections" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "idx_extension_connections_user_created" ON "extension_connections" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_extension_connections_expires_at" ON "extension_connections" USING btree ("expires_at");
