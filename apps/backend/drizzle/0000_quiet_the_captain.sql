CREATE TYPE "public"."mood_type" AS ENUM('energised', 'happy', 'calm', 'focused', 'neutral', 'tired', 'stressed', 'sad', 'unheard');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('member', 'manager', 'admin');--> statement-breakpoint
CREATE TABLE "admin_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mood_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"mood_type" "mood_type" NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"note_hash" text,
	"hour_of_day" smallint NOT NULL,
	"submission_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"device_token" uuid NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"join_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mood_submissions" ADD CONSTRAINT "mood_submissions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_credentials_email_unique" ON "admin_credentials" USING btree ("email");--> statement-breakpoint
CREATE INDEX "mood_submissions_team_id_idx" ON "mood_submissions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "mood_submissions_submission_date_idx" ON "mood_submissions" USING btree ("submission_date");--> statement-breakpoint
CREATE INDEX "mood_submissions_hour_of_day_idx" ON "mood_submissions" USING btree ("hour_of_day");--> statement-breakpoint
CREATE INDEX "mood_submissions_mood_type_idx" ON "mood_submissions" USING btree ("mood_type");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_device_token_unique" ON "team_members" USING btree ("device_token");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teams_workspace_id_idx" ON "teams" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_join_code_unique" ON "workspaces" USING btree ("join_code");