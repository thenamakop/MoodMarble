-- Idempotent baseline snapshot that only adds objects not already created by
-- 0000_init.sql. The enum types and core tables are created in 0000_init.sql
-- so they must not be duplicated here.

CREATE TABLE IF NOT EXISTS "admin_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_credentials_email_unique" ON "admin_credentials" USING btree ("email");
