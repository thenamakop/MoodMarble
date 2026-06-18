import { and, eq } from "drizzle-orm";

import {
  DashboardDailySchema,
  type DashboardDaily,
  type Mood,
  MOODS,
  type Tag,
} from "../../../../packages/shared";

import type { DatabaseClient } from "../db/client";
import { moodSubmissions, teamMembers } from "../db/schema";
import {
  createDashboardPrivacyState,
  getDashboardHourPrivacy,
  getDashboardWindowPrivacy,
  toDashboardCountValue,
  toDashboardScoreValue,
} from "./dashboard-privacy";

const MOOD_SCORES: Record<Mood, number> = {
  energised: 9,
  happy: 8,
  calm: 7,
  focused: 6,
  neutral: 5,
  tired: 4,
  stressed: 3,
  sad: 2,
  unheard: 1,
};

export interface DashboardAnalyticsSubmission {
  teamId: string;
  moodType: Mood;
  tags: Tag[];
  hourOfDay: number;
  submissionDate: string;
}

export interface DashboardAnalyticsSource {
  listDailySubmissions(
    teamId: string,
    submissionDate: string,
  ): Promise<DashboardAnalyticsSubmission[]>;
  getTeamMemberCount(teamId: string): Promise<number>;
}

export class InMemoryDashboardAnalyticsSource implements DashboardAnalyticsSource {
  constructor(
    private readonly submissions: DashboardAnalyticsSubmission[] = [],
    private readonly teamMemberCounts: Record<string, number> = {},
  ) {}

  async listDailySubmissions(
    teamId: string,
    submissionDate: string,
  ): Promise<DashboardAnalyticsSubmission[]> {
    return this.submissions.filter(
      (submission) =>
        submission.teamId === teamId &&
        submission.submissionDate === submissionDate,
    );
  }

  async getTeamMemberCount(teamId: string): Promise<number> {
    return this.teamMemberCounts[teamId] ?? 0;
  }
}

export class PostgresDashboardAnalyticsSource implements DashboardAnalyticsSource {
  constructor(private readonly databaseClient: DatabaseClient) {}

  async listDailySubmissions(
    teamId: string,
    submissionDate: string,
  ): Promise<DashboardAnalyticsSubmission[]> {
    const submissionRecords =
      await this.databaseClient.db.query.moodSubmissions.findMany({
        where: and(
          eq(moodSubmissions.teamId, teamId),
          eq(moodSubmissions.submissionDate, submissionDate),
        ),
        orderBy: (submissionTable, { asc }) => [
          asc(submissionTable.hourOfDay),
          asc(submissionTable.id),
        ],
      });

    return submissionRecords.map((submissionRecord) => ({
      teamId: submissionRecord.teamId,
      moodType: submissionRecord.moodType,
      tags: submissionRecord.tags as Tag[],
      hourOfDay: submissionRecord.hourOfDay,
      submissionDate: submissionRecord.submissionDate,
    }));
  }

  async getTeamMemberCount(teamId: string): Promise<number> {
    const teamMemberRecords =
      await this.databaseClient.db.query.teamMembers.findMany({
        columns: {
          id: true,
        },
        where: eq(teamMembers.teamId, teamId),
      });

    return teamMemberRecords.length;
  }
}

interface DailyDashboardServiceOptions {
  analyticsSource: DashboardAnalyticsSource;
  now?: () => Date;
}

interface GetDailyDashboardInput {
  teamId: string;
  date?: string;
}

export class DailyDashboardService {
  constructor(private readonly options: DailyDashboardServiceOptions) {}

  async getDailyDashboard(
    input: GetDailyDashboardInput,
  ): Promise<DashboardDaily> {
    const date =
      input.date ?? getUtcDateKey(this.options.now?.() ?? new Date());
    const submissions = await this.options.analyticsSource.listDailySubmissions(
      input.teamId,
      date,
    );
    const teamMemberCount =
      await this.options.analyticsSource.getTeamMemberCount(input.teamId);
    const topLevelPrivacy = getDashboardWindowPrivacy({
      totalSubmissions: submissions.length,
      teamMemberCount,
    });

    const response = DashboardDailySchema.parse({
      team_id: input.teamId,
      date,
      privacy: topLevelPrivacy,
      summary: {
        total_submissions: toDashboardCountValue(
          submissions.length,
          topLevelPrivacy,
        ),
        mood_distribution: buildMoodDistribution(submissions, topLevelPrivacy),
        alert_state:
          topLevelPrivacy.visibility === "hidden"
            ? {
                status: "hidden",
                message: null,
              }
            : {
                status: "inactive",
                message: null,
              },
      },
      hourly_buckets: Array.from({ length: 24 }, (_, hourOfDay) => {
        const hourlySubmissions = submissions.filter(
          (submission) => submission.hourOfDay === hourOfDay,
        );
        const hourPrivacy = getDashboardHourPrivacy({
          totalSubmissions: submissions.length,
          teamMemberCount,
          hourSubmissions: hourlySubmissions.length,
        });

        return {
          hour_of_day: hourOfDay,
          privacy: hourPrivacy,
          total_submissions: toDashboardCountValue(
            hourlySubmissions.length,
            hourPrivacy,
          ),
          average_mood_score: toDashboardScoreValue(
            calculateAverageMoodScore(hourlySubmissions),
            hourPrivacy,
          ),
          mood_counts: buildMoodDistribution(hourlySubmissions, hourPrivacy),
        };
      }),
    });

    return response;
  }
}

function buildMoodDistribution(
  submissions: DashboardAnalyticsSubmission[],
  privacy: ReturnType<typeof createDashboardPrivacyState>,
) {
  const moodCounts = submissions.reduce<Record<Mood, number>>(
    (counts, submission) => ({
      ...counts,
      [submission.moodType]: (counts[submission.moodType] ?? 0) + 1,
    }),
    createEmptyMoodCountMap(),
  );

  return MOODS.map((moodType) => ({
    mood_type: moodType,
    count: toDashboardCountValue(moodCounts[moodType], privacy),
  }));
}

function createEmptyMoodCountMap(): Record<Mood, number> {
  return Object.fromEntries(MOODS.map((moodType) => [moodType, 0])) as Record<
    Mood,
    number
  >;
}

function calculateAverageMoodScore(
  submissions: DashboardAnalyticsSubmission[],
): number {
  if (submissions.length === 0) {
    return 5;
  }

  const totalScore = submissions.reduce((sum, submission) => {
    return sum + MOOD_SCORES[submission.moodType];
  }, 0);

  return Number((totalScore / submissions.length).toFixed(2));
}

function getUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
