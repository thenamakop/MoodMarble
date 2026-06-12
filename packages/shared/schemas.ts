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

export const WorkspaceIdSchema = z.string().min(1, "workspace_id is required");
export const TeamIdSchema = z.string().min(1, "team_id is required");
export const MarbleIdSchema = z.string().min(1, "marble_id is required");
export const HourOfDaySchema = z
  .number()
  .int()
  .min(0, "hour_of_day must be between 0 and 23")
  .max(23, "hour_of_day must be between 0 and 23");
export const MoodSubmissionTagsSchema = z
  .array(TagSchema)
  .max(2, "Up to 2 tags are allowed per submission.")
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
  })
  .strict();

export const MoodSubmissionResponseSchema = z.object({
  status: z.literal("received"),
  marble_id: MarbleIdSchema,
});

export const TeamSummarySchema = z.object({
  id: TeamIdSchema,
  name: z.string().min(1),
});

export const WorkspaceJoinResponseSchema = z.object({
  workspace: z.object({
    id: WorkspaceIdSchema,
    name: z.string().min(1),
  }),
  teams: z.array(TeamSummarySchema),
  device_jwt: z.string().min(1),
  device_token: DeviceTokenSchema,
});

export const MoodCountSchema = z.object({
  mood_type: MoodSchema,
  count: z.number().int().nonnegative(),
});

export const HourlyMoodBucketSchema = z.object({
  hour_of_day: z.number().int().min(0).max(23),
  total_submissions: z.number().int().nonnegative(),
  average_mood_score: z.number().min(1).max(9).nullable().optional(),
  mood_counts: z.array(MoodCountSchema),
});

export const WeeklyMoodPointSchema = z.object({
  date: z.string().min(1),
  average_mood_score: z.number().min(1).max(9),
  total_submissions: z.number().int().nonnegative(),
});

export const TagCountSchema = z.object({
  tag: TagSchema,
  count: z.number().int().nonnegative(),
});

export const DashboardDailySchema = z.object({
  team_id: TeamIdSchema,
  date: z.string().min(1),
  total_submissions: z.number().int().nonnegative(),
  blurred: z.boolean(),
  buckets: z.array(HourlyMoodBucketSchema),
});

export const DashboardWeeklySchema = z.object({
  team_id: TeamIdSchema,
  week_start: z.string().min(1),
  total_submissions: z.number().int().nonnegative(),
  blurred: z.boolean(),
  points: z.array(WeeklyMoodPointSchema),
});

export const DashboardTagsSchema = z.object({
  team_id: TeamIdSchema,
  week_start: z.string().min(1),
  total_submissions: z.number().int().nonnegative(),
  blurred: z.boolean(),
  tags: z.array(TagCountSchema),
});
