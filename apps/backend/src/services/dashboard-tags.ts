import {
  DashboardTagsSchema,
  TAGS,
  type DashboardTags,
  type Tag,
} from "../../../../packages/shared";

import {
  buildMoodDistribution,
  type DashboardAnalyticsSource,
} from "./dashboard-daily";
import {
  getDashboardWindowPrivacy,
  toDashboardCountValue,
} from "./dashboard-privacy";
import { getWeekWindow } from "./dashboard-weekly";

interface TagsDashboardServiceOptions {
  analyticsSource: DashboardAnalyticsSource;
  now?: () => Date;
}

interface GetTagsDashboardInput {
  teamId: string;
  startDate?: string;
}

export class TagsDashboardService {
  constructor(private readonly options: TagsDashboardServiceOptions) {}

  async getTagsDashboard(input: GetTagsDashboardInput): Promise<DashboardTags> {
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

    const tagCounts = buildTagCounts(submissions).map(({ tag, count }) => ({
      tag,
      count: toDashboardCountValue(count, topLevelPrivacy),
    }));

    return DashboardTagsSchema.parse({
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
      tag_counts: tagCounts,
    });
  }
}

function buildTagCounts(
  submissions: Awaited<
    ReturnType<DashboardAnalyticsSource["listSubmissionsInDateRange"]>
  >,
) {
  const counts = submissions.reduce<Record<Tag, number>>((acc, submission) => {
    for (const tag of submission.tags) {
      acc[tag] = (acc[tag] ?? 0) + 1;
    }

    return acc;
  }, createEmptyTagCountMap());

  return TAGS.map((tag) => ({
    tag,
    count: counts[tag],
  }))
    .filter(({ count }) => count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return TAGS.indexOf(left.tag) - TAGS.indexOf(right.tag);
    });
}

function createEmptyTagCountMap(): Record<Tag, number> {
  return Object.fromEntries(TAGS.map((tag) => [tag, 0])) as Record<Tag, number>;
}
