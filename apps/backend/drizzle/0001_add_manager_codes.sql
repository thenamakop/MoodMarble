-- Idempotent migration that adds the manager_codes table and its indexes.
-- All CREATE statements use IF NOT EXISTS so the migration is safe to re-run.

CREATE TABLE IF NOT EXISTS "manager_codes" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "workspace_id" text NOT NULL,
  "team_id" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "is_revoked" smallint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manager_codes"
  ADD CONSTRAINT IF NOT EXISTS "manager_codes_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manager_codes"
  ADD CONSTRAINT IF NOT EXISTS "manager_codes_team_id_teams_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "manager_codes_code_unique"
  ON "manager_codes" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_codes_team_id_idx"
  ON "manager_codes" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_codes_workspace_id_idx"
  ON "manager_codes" USING btree ("workspace_id");
