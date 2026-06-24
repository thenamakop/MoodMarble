// apps/backend/src/db/schema.ts
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  date,
  smallint,
  uuid,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * Shared enums
 * Keep these aligned with packages/shared.
 */
export const moodTypeEnum = pgEnum("mood_type", [
  "energised",
  "happy",
  "calm",
  "focused",
  "neutral",
  "tired",
  "stressed",
  "sad",
  "unheard",
]);

export const teamRoleEnum = pgEnum("team_role", ["member", "manager", "admin"]);

/**
 * workspaces
 * Top-level org container.
 */
export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    joinCode: text("join_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    joinCodeUnique: uniqueIndex("workspaces_join_code_unique").on(
      table.joinCode,
    ),
  }),
);

/**
 * teams
 * A workspace can have multiple teams.
 */
export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("teams_workspace_id_idx").on(table.workspaceId),
  }),
);

/**
 * team_members
 * Anonymous device participation per team.
 * The device token is NOT a submission field.
 */
export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    deviceToken: uuid("device_token").notNull(),
    role: teamRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    deviceTokenUnique: uniqueIndex("team_members_device_token_unique").on(
      table.deviceToken,
    ),
    teamIdx: index("team_members_team_id_idx").on(table.teamId),
  }),
);

/**
 * mood_submissions
 * Anonymous mood data only.
 * No user_id, no email, no names, no raw note text.
 */
export const moodSubmissions = pgTable(
  "mood_submissions",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    moodType: moodTypeEnum("mood_type").notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    noteHash: text("note_hash"),
    hourOfDay: smallint("hour_of_day").notNull(),
    submissionDate: date("submission_date").notNull(),
  },
  (table) => ({
    teamIdx: index("mood_submissions_team_id_idx").on(table.teamId),
    submissionDateIdx: index("mood_submissions_submission_date_idx").on(
      table.submissionDate,
    ),
    hourOfDayIdx: index("mood_submissions_hour_of_day_idx").on(table.hourOfDay),
    moodTypeIdx: index("mood_submissions_mood_type_idx").on(table.moodType),
  }),
);

/**
 * admin_credentials
 * Used for admin panel login.
 */
export const adminCredentials = pgTable(
  "admin_credentials",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    active: smallint("active").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("admin_credentials_email_unique").on(table.email),
  }),
);

/**
 * Relations
 */
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [teams.workspaceId],
    references: [workspaces.id],
  }),
  teamMembers: many(teamMembers),
  moodSubmissions: many(moodSubmissions),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const moodSubmissionsRelations = relations(
  moodSubmissions,
  ({ one }) => ({
    team: one(teams, {
      fields: [moodSubmissions.teamId],
      references: [teams.id],
    }),
  }),
);

/**
 * Optional exported types
 * Useful for services later.
 */
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

export type MoodSubmission = typeof moodSubmissions.$inferSelect;
export type NewMoodSubmission = typeof moodSubmissions.$inferInsert;
