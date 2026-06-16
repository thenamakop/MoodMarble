import { z } from "zod";
import {
  DashboardDailySchema,
  DashboardTagsSchema,
  DashboardWeeklySchema,
  DeviceTokenSchema,
  HourOfDaySchema,
  HourlyMoodBucketSchema,
  JoinCodeSchema,
  MarbleIdSchema,
  MoodCountSchema,
  MoodSubmissionNoteSchema,
  MoodSchema,
  MoodSubmissionResponseSchema,
  MoodSubmissionSchema,
  MoodSubmissionTagsSchema,
  SubmissionDateSchema,
  TagCountSchema,
  TagSchema,
  TeamSummarySchema,
  TeamIdSchema,
  WorkspaceJoinRequestSchema,
  WorkspaceIdSchema,
  WorkspaceJoinResponseSchema,
  WeeklyMoodPointSchema,
} from "./schemas";

export type Mood = z.infer<typeof MoodSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type JoinCode = z.infer<typeof JoinCodeSchema>;
export type DeviceToken = z.infer<typeof DeviceTokenSchema>;
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;
export type TeamId = z.infer<typeof TeamIdSchema>;
export type HourOfDay = z.infer<typeof HourOfDaySchema>;
export type SubmissionDate = z.infer<typeof SubmissionDateSchema>;
export type MoodSubmissionTags = z.infer<typeof MoodSubmissionTagsSchema>;
export type MoodSubmissionNote = z.infer<typeof MoodSubmissionNoteSchema>;

export type MoodSubmission = z.infer<typeof MoodSubmissionSchema>;
export type MoodSubmissionResponse = z.infer<
  typeof MoodSubmissionResponseSchema
>;

export type TeamSummary = z.infer<typeof TeamSummarySchema>;
export type WorkspaceJoinRequest = z.infer<typeof WorkspaceJoinRequestSchema>;
export type WorkspaceJoinResponse = z.infer<typeof WorkspaceJoinResponseSchema>;

export type MoodCount = z.infer<typeof MoodCountSchema>;
export type HourlyMoodBucket = z.infer<typeof HourlyMoodBucketSchema>;
export type WeeklyMoodPoint = z.infer<typeof WeeklyMoodPointSchema>;
export type TagCount = z.infer<typeof TagCountSchema>;

export type DashboardDaily = z.infer<typeof DashboardDailySchema>;
export type DashboardWeekly = z.infer<typeof DashboardWeeklySchema>;
export type DashboardTags = z.infer<typeof DashboardTagsSchema>;

export type MarbleId = z.infer<typeof MarbleIdSchema>;
