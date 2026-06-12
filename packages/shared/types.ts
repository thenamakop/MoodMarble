import { z } from "zod";
import {
  DashboardDailySchema,
  DashboardTagsSchema,
  DashboardWeeklySchema,
  DeviceTokenSchema,
  HourlyMoodBucketSchema,
  JoinCodeSchema,
  MarbleIdSchema,
  MoodCountSchema,
  MoodSchema,
  MoodSubmissionResponseSchema,
  MoodSubmissionSchema,
  TagCountSchema,
  TagSchema,
  TeamSummarySchema,
  WorkspaceJoinResponseSchema,
  WeeklyMoodPointSchema,
} from "./schemas";

export type Mood = z.infer<typeof MoodSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type JoinCode = z.infer<typeof JoinCodeSchema>;
export type DeviceToken = z.infer<typeof DeviceTokenSchema>;

export type MoodSubmission = z.infer<typeof MoodSubmissionSchema>;
export type MoodSubmissionResponse = z.infer<typeof MoodSubmissionResponseSchema>;

export type TeamSummary = z.infer<typeof TeamSummarySchema>;
export type WorkspaceJoinResponse = z.infer<typeof WorkspaceJoinResponseSchema>;

export type MoodCount = z.infer<typeof MoodCountSchema>;
export type HourlyMoodBucket = z.infer<typeof HourlyMoodBucketSchema>;
export type WeeklyMoodPoint = z.infer<typeof WeeklyMoodPointSchema>;
export type TagCount = z.infer<typeof TagCountSchema>;

export type DashboardDaily = z.infer<typeof DashboardDailySchema>;
export type DashboardWeekly = z.infer<typeof DashboardWeeklySchema>;
export type DashboardTags = z.infer<typeof DashboardTagsSchema>;

export type MarbleId = z.infer<typeof MarbleIdSchema>;