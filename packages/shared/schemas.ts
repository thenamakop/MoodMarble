import { z } from "zod";
import { MOODS, TAGS } from "./moods";

export const MoodSchema = z.enum(MOODS);
export const TagSchema = z.enum(TAGS);

export const JoinCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z0-9]{6}$/.test(value), {
    message: "Join code must be exactly 6 alphanumeric characters.",
  });

export const DeviceTokenSchema = z.string().uuid();
export const TeamRoleSchema = z.enum(["member", "manager", "admin"]);

export const WorkspaceIdSchema = z.string().min(1, "workspace_id is required");
export const TeamIdSchema = z.string().min(1, "team_id is required");
export const MarbleIdSchema = z.string().min(1, "marble_id is required");
export const WorkspaceNameSchema = z
  .string()
  .trim()
  .min(1, "workspace name is required");
export const TeamNameSchema = z.string().trim().min(1, "team name is required");
export const HourOfDaySchema = z
  .number()
  .int()
  .min(0, "hour_of_day must be between 0 and 23")
  .max(23, "hour_of_day must be between 0 and 23");
export const SubmissionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "submission_date must be YYYY-MM-DD")
  .refine((value) => {
    const [yearPart, monthPart, dayPart] = value.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);
    const day = Number(dayPart);

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return false;
    }

    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    return (
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day
    );
  }, "submission_date must be a real calendar date");
export const MoodSubmissionTagsSchema = z
  .array(TagSchema)
  .max(2, "Up to 2 tags are allowed per submission.")
  .refine((tags) => new Set(tags).size === tags.length, {
    message: "Duplicate tags are not allowed.",
  })
  .default([]);
export const MoodSubmissionNoteSchema = z
  .string()
  .trim()
  .max(120, "Note must be 120 characters or fewer.")
  .optional();

export const MoodSubmissionSchema = z
  .object({
    workspace_id: WorkspaceIdSchema,
    team_id: TeamIdSchema,
    mood_type: MoodSchema,
    tags: MoodSubmissionTagsSchema,
    note: MoodSubmissionNoteSchema,
    hour_of_day: HourOfDaySchema,
    submission_date: SubmissionDateSchema,
  })
  .strict();

export const MoodSubmissionResponseSchema = z.object({
  status: z.literal("received"),
  marble_id: MarbleIdSchema,
});

export const TeamSummarySchema = z
  .object({
    id: TeamIdSchema,
    name: z.string().min(1),
  })
  .strict();

export const WorkspaceJoinRequestSchema = z
  .object({
    join_code: JoinCodeSchema,
    device_token: DeviceTokenSchema,
  })
  .strict();

export const WorkspaceJoinResponseSchema = z
  .object({
    workspace: z
      .object({
        id: WorkspaceIdSchema,
        name: z.string().min(1),
      })
      .strict(),
    teams: z.array(TeamSummarySchema),
    device_jwt: z.string().min(1),
  })
  .strict();

export const AdminWorkspaceSchema = z
  .object({
    id: WorkspaceIdSchema,
    name: WorkspaceNameSchema,
    join_code: JoinCodeSchema,
  })
  .strict();

export const AdminTeamSchema = z
  .object({
    id: TeamIdSchema,
    workspace_id: WorkspaceIdSchema,
    name: TeamNameSchema,
  })
  .strict();

export const AdminWorkspaceCreateRequestSchema = z
  .object({
    name: WorkspaceNameSchema,
  })
  .strict();

export const AdminWorkspaceCreateResponseSchema = z
  .object({
    workspace: AdminWorkspaceSchema,
    admin_jwt: z.string().min(1),
  })
  .strict();

export const AdminTeamCreateRequestSchema = z
  .object({
    name: TeamNameSchema,
  })
  .strict();

export const AdminTeamUpdateRequestSchema = z
  .object({
    name: TeamNameSchema,
  })
  .strict();

export const AdminTeamResponseSchema = z
  .object({
    team: AdminTeamSchema,
  })
  .strict();

export const AdminTeamListResponseSchema = z
  .object({
    teams: z.array(AdminTeamSchema),
  })
  .strict();

export const AdminJoinCodeResponseSchema = z
  .object({
    workspace: z
      .object({
        id: WorkspaceIdSchema,
        join_code: JoinCodeSchema,
      })
      .strict(),
  })
  .strict();

export const AdminExportRecordSchema = z
  .object({
    team_id: TeamIdSchema,
    team_name: TeamNameSchema,
    mood_type: MoodSchema,
    tags: MoodSubmissionTagsSchema,
    hour_of_day: HourOfDaySchema,
    submission_date: SubmissionDateSchema,
  })
  .strict();

export const ManagerJwtPayloadSchema = z
  .object({
    workspace_id: WorkspaceIdSchema,
    team_id: TeamIdSchema,
    role: z.literal("manager"),
  })
  .strict();

export const AdminJwtPayloadSchema = z
  .object({
    workspace_id: WorkspaceIdSchema,
    role: z.literal("admin"),
  })
  .strict();

export const DashboardMetricVisibilitySchema = z.enum([
  "visible",
  "blurred",
  "hidden",
]);

export const DashboardThresholdReasonSchema = z.enum([
  "minimum_submissions",
  "minimum_members_for_precise_values",
  "minimum_hourly_submissions",
]);

export const DashboardCountValueSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("exact"),
        value: z.number().int().nonnegative(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("range"),
        min: z.number().int().nonnegative(),
        max: z.number().int().nonnegative(),
      })
      .strict()
      .refine((value) => value.max >= value.min, {
        message: "range max must be greater than or equal to range min",
      }),
    z
      .object({
        kind: z.literal("hidden"),
      })
      .strict(),
  ])
  .describe("Exact count, blurred range, or fully hidden metric.");

export const DashboardScoreValueSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("exact"),
        value: z.number().min(1).max(9),
      })
      .strict(),
    z
      .object({
        kind: z.literal("range"),
        min: z.number().min(1).max(9),
        max: z.number().min(1).max(9),
      })
      .strict()
      .refine((value) => value.max >= value.min, {
        message: "range max must be greater than or equal to range min",
      }),
    z
      .object({
        kind: z.literal("hidden"),
      })
      .strict(),
  ])
  .describe("Exact score, blurred score range, or fully hidden score.");

export const MoodCountSchema = z.object({
  mood_type: MoodSchema,
  count: DashboardCountValueSchema,
});

export const DashboardAlertStateSchema = z
  .object({
    status: z.enum(["hidden", "inactive", "active"]),
    message: z.string().trim().min(1).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "active" && !value.message) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "active alert state requires a message",
        path: ["message"],
      });
    }

    if (value.status !== "active" && value.message !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "inactive or hidden alert state must not include a message",
        path: ["message"],
      });
    }
  });

export const DashboardThresholdsSchema = z
  .object({
    minimum_submissions: z.literal(5),
    minimum_members_for_precise_values: z.literal(5),
    minimum_hourly_submissions: z.literal(3),
  })
  .strict();

export const DashboardPrivacyStateSchema = z
  .object({
    visibility: DashboardMetricVisibilitySchema,
    reasons: z.array(DashboardThresholdReasonSchema),
    thresholds: DashboardThresholdsSchema,
  })
  .strict();

export const DashboardWidgetSummarySchema = z
  .object({
    total_submissions: DashboardCountValueSchema,
    mood_distribution: z.array(MoodCountSchema),
    alert_state: DashboardAlertStateSchema,
  })
  .strict();

export const HourlyMoodBucketSchema = z
  .object({
    hour_of_day: z.number().int().min(0).max(23),
    privacy: DashboardPrivacyStateSchema,
    total_submissions: DashboardCountValueSchema,
    average_mood_score: DashboardScoreValueSchema,
    mood_counts: z.array(MoodCountSchema),
  })
  .strict();

export const WeeklyMoodPointSchema = z
  .object({
    date: SubmissionDateSchema,
    privacy: DashboardPrivacyStateSchema,
    total_submissions: DashboardCountValueSchema,
    average_mood_score: DashboardScoreValueSchema,
  })
  .strict();

export const TagCountSchema = z.object({
  tag: TagSchema,
  count: DashboardCountValueSchema,
});

export const DashboardDateWindowSchema = z
  .object({
    start_date: SubmissionDateSchema,
    end_date: SubmissionDateSchema,
  })
  .strict();

export const AdminExportQuerySchema = z
  .object({
    start_date: SubmissionDateSchema,
    end_date: SubmissionDateSchema,
  })
  .strict()
  .refine((value) => value.start_date <= value.end_date, {
    message: "start_date must be less than or equal to end_date",
    path: ["end_date"],
  });

export const DashboardDailySchema = z
  .object({
    team_id: TeamIdSchema,
    date: SubmissionDateSchema,
    privacy: DashboardPrivacyStateSchema,
    summary: DashboardWidgetSummarySchema,
    hourly_buckets: z.array(HourlyMoodBucketSchema).length(24),
  })
  .strict();

export const DashboardWeeklySchema = z
  .object({
    team_id: TeamIdSchema,
    window: DashboardDateWindowSchema,
    privacy: DashboardPrivacyStateSchema,
    summary: DashboardWidgetSummarySchema,
    daily_points: z.array(WeeklyMoodPointSchema).length(7),
  })
  .strict();

export const DashboardTagsSchema = z
  .object({
    team_id: TeamIdSchema,
    window: DashboardDateWindowSchema,
    privacy: DashboardPrivacyStateSchema,
    summary: DashboardWidgetSummarySchema,
    tag_counts: z.array(TagCountSchema),
  })
  .strict();

export const ManagerCodeInputSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9]{6}$/.test(v), {
    message: "Manager code must be 6 uppercase letters or numbers.",
  });

export const RedeemManagerCodeRequestSchema = z
  .object({ code: ManagerCodeInputSchema })
  .strict();

export const RedeemManagerCodeResponseSchema = z
  .object({
    manager_jwt: z.string().min(1),
    workspace_id: z.string().min(1),
    team_id: z.string().min(1),
    team_name: z.string().min(1),
    manager_teams: z.string().min(1),
  })
  .strict();

export const AdminGenerateManagerCodeResponseSchema = z
  .object({
    code: z.string().length(6),
    team_id: z.string().min(1),
    expires_at: z.string().min(1),
  })
  .strict();

export const AdminManagerCodeItemSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().length(6),
    team_id: z.string().min(1),
    team_name: z.string().min(1),
    expires_at: z.string().min(1),
    used_at: z.string().nullable(),
    is_revoked: z.boolean(),
    status: z.enum(["active", "used", "expired", "revoked"]),
  })
  .strict();

export const AdminManagerCodeListResponseSchema = z
  .object({ codes: z.array(AdminManagerCodeItemSchema) })
  .strict();
