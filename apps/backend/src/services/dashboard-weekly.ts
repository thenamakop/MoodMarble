import {
  DashboardWeeklySchema,
  type DashboardWeekly,
} from "../../../../packages/shared";

import {
  buildMoodDistribution,
  calculateAverageMoodScore,
  type DashboardAnalyticsSource,
  getUtcDateKey,
} from "./dashboard-daily";
import {
  getDashboardWindowPrivacy,
  toDashboardCountValue,
  toDashboardScoreValue,
} from "./dashboard-privacy";

interface WeeklyDashboardServiceOptions {
  analyticsSource: DashboardAnalyticsSource;
  now?: () => Date;
}

interface GetWeeklyDashboardInput {
  teamId: string;
  startDate?: string;
}

export class WeeklyDashboardService {
  constructor(private readonly options: WeeklyDashboardServiceOptions) {}

  async getWeeklyDashboard(
    input: GetWeeklyDashboardInput,
  ): Promise<DashboardWeekly> {
    const window = getWeekWindow(
      input.startDate,
      this.options.now?.() ?? new Date(),
    );
    const submissions =
      await this.options.analyticsSource.listSubmissionsInDateRange(
        input.teamId,
        window.startDate,
        window.endDate,
      );
    const teamMemberCount =
      await this.options.analyticsSource.getTeamMemberCount(input.teamId);
    const topLevelPrivacy = getDashboardWindowPrivacy({
      totalSubmissions: submissions.length,
      teamMemberCount,
    });

    return DashboardWeeklySchema.parse({
      team_id: input.teamId,
      window: {
        start_date: window.startDate,
        end_date: window.endDate,
      },
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
      daily_points: window.dayKeys.map((dayKey) => {
        const daySubmissions = submissions.filter(
          (submission) => submission.submissionDate === dayKey,
        );

        return {
          date: dayKey,
          privacy: topLevelPrivacy,
          total_submissions: toDashboardCountValue(
            daySubmissions.length,
            topLevelPrivacy,
          ),
          average_mood_score: toDashboardScoreValue(
            calculateAverageMoodScore(daySubmissions),
            topLevelPrivacy,
          ),
        };
      }),
    });
  }
}

export function getWeekWindow(startDate: string | undefined, now: Date) {
  const start = startDate
    ? parseDateKey(startDate)
    : getStartOfWeek(parseDateKey(getUtcDateKey(now)));

  const dayKeys = Array.from({ length: 7 }, (_, index) =>
    addDays(start, index).toISOString().slice(0, 10),
  );

  return {
    startDate: dayKeys[0]!,
    endDate: dayKeys[6]!,
    dayKeys,
  };
}

function getStartOfWeek(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  return addDays(date, diff);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}
