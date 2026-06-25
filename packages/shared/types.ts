import { z } from "zod";
import {
  AdminExportQuerySchema,
  AdminExportRecordSchema,
  AdminJwtPayloadSchema,
  AdminJoinCodeResponseSchema,
  AdminTeamCreateRequestSchema,
  AdminTeamListResponseSchema,
  AdminTeamResponseSchema,
  AdminTeamSchema,
  AdminTeamUpdateRequestSchema,
  AdminWorkspaceCreateRequestSchema,
  AdminWorkspaceCreateResponseSchema,
  AdminWorkspaceSchema,
  DashboardAlertStateSchema,
  DashboardCountValueSchema,
  DashboardDateWindowSchema,
  DashboardDailySchema,
  DashboardMetricVisibilitySchema,
  DashboardPrivacyStateSchema,
  DashboardScoreValueSchema,
  DashboardThresholdReasonSchema,
  DashboardThresholdsSchema,
  DashboardTagsSchema,
  DashboardWeeklySchema,
  DeviceTokenSchema,
  HourOfDaySchema,
  HourlyMoodBucketSchema,
  JoinCodeSchema,
  ManagerJwtPayloadSchema,
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
  TeamNameSchema,
  TeamSummarySchema,
  TeamRoleSchema,
  TeamIdSchema,
  WorkspaceJoinRequestSchema,
  WorkspaceIdSchema,
  WorkspaceJoinResponseSchema,
  WorkspaceNameSchema,
  WeeklyMoodPointSchema,
  RedeemManagerCodeRequestSchema,
  RedeemManagerCodeResponseSchema,
  AdminGenerateManagerCodeResponseSchema,
  AdminManagerCodeItemSchema,
  AdminManagerCodeListResponseSchema,
} from "./schemas";

export type Mood = z.infer<typeof MoodSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type JoinCode = z.infer<typeof JoinCodeSchema>;
export type DeviceToken = z.infer<typeof DeviceTokenSchema>;
export type TeamRole = z.infer<typeof TeamRoleSchema>;
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;
export type TeamId = z.infer<typeof TeamIdSchema>;
export type WorkspaceName = z.infer<typeof WorkspaceNameSchema>;
export type TeamName = z.infer<typeof TeamNameSchema>;
export type HourOfDay = z.infer<typeof HourOfDaySchema>;
export type SubmissionDate = z.infer<typeof SubmissionDateSchema>;
export type MoodSubmissionTags = z.infer<typeof MoodSubmissionTagsSchema>;
export type MoodSubmissionNote = z.infer<typeof MoodSubmissionNoteSchema>;
export type AdminWorkspace = z.infer<typeof AdminWorkspaceSchema>;
export type AdminTeam = z.infer<typeof AdminTeamSchema>;
export type AdminWorkspaceCreateRequest = z.infer<
  typeof AdminWorkspaceCreateRequestSchema
>;
export type AdminWorkspaceCreateResponse = z.infer<
  typeof AdminWorkspaceCreateResponseSchema
>;
export type AdminTeamCreateRequest = z.infer<
  typeof AdminTeamCreateRequestSchema
>;
export type AdminTeamUpdateRequest = z.infer<
  typeof AdminTeamUpdateRequestSchema
>;
export type AdminTeamResponse = z.infer<typeof AdminTeamResponseSchema>;
export type AdminTeamListResponse = z.infer<typeof AdminTeamListResponseSchema>;
export type AdminJoinCodeResponse = z.infer<typeof AdminJoinCodeResponseSchema>;
export type AdminExportQuery = z.infer<typeof AdminExportQuerySchema>;
export type AdminExportRecord = z.infer<typeof AdminExportRecordSchema>;
export type AdminJwtPayload = z.infer<typeof AdminJwtPayloadSchema>;
export type ManagerJwtPayload = z.infer<typeof ManagerJwtPayloadSchema>;

export type MoodSubmission = z.infer<typeof MoodSubmissionSchema>;
export type MoodSubmissionResponse = z.infer<
  typeof MoodSubmissionResponseSchema
>;

export type TeamSummary = z.infer<typeof TeamSummarySchema>;
export type WorkspaceJoinRequest = z.infer<typeof WorkspaceJoinRequestSchema>;
export type WorkspaceJoinResponse = z.infer<typeof WorkspaceJoinResponseSchema>;

export type DashboardMetricVisibility = z.infer<
  typeof DashboardMetricVisibilitySchema
>;
export type DashboardThresholdReason = z.infer<
  typeof DashboardThresholdReasonSchema
>;
export type DashboardCountValue = z.infer<typeof DashboardCountValueSchema>;
export type DashboardScoreValue = z.infer<typeof DashboardScoreValueSchema>;
export type DashboardAlertState = z.infer<typeof DashboardAlertStateSchema>;
export type DashboardThresholds = z.infer<typeof DashboardThresholdsSchema>;
export type DashboardPrivacyState = z.infer<typeof DashboardPrivacyStateSchema>;
export type DashboardDateWindow = z.infer<typeof DashboardDateWindowSchema>;
export type MoodCount = z.infer<typeof MoodCountSchema>;
export type HourlyMoodBucket = z.infer<typeof HourlyMoodBucketSchema>;
export type WeeklyMoodPoint = z.infer<typeof WeeklyMoodPointSchema>;
export type TagCount = z.infer<typeof TagCountSchema>;

export type DashboardDaily = z.infer<typeof DashboardDailySchema>;
export type DashboardWeekly = z.infer<typeof DashboardWeeklySchema>;
export type DashboardTags = z.infer<typeof DashboardTagsSchema>;

export type MarbleId = z.infer<typeof MarbleIdSchema>;

export type RedeemManagerCodeRequest = z.infer<
  typeof RedeemManagerCodeRequestSchema
>;
export type RedeemManagerCodeResponse = z.infer<
  typeof RedeemManagerCodeResponseSchema
>;
export type AdminGenerateManagerCodeResponse = z.infer<
  typeof AdminGenerateManagerCodeResponseSchema
>;
export type AdminManagerCodeItem = z.infer<typeof AdminManagerCodeItemSchema>;
export type AdminManagerCodeListResponse = z.infer<
  typeof AdminManagerCodeListResponseSchema
>;
