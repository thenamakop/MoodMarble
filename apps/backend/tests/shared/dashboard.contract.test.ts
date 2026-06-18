import { describe, expect, it } from "vitest";

import {
  DashboardDailySchema,
  DashboardTagsSchema,
  DashboardWeeklySchema,
} from "../../../../packages/shared";

const DASHBOARD_THRESHOLDS = {
  minimum_submissions: 5 as const,
  minimum_members_for_precise_values: 5 as const,
  minimum_hourly_submissions: 3 as const,
};

describe("dashboard contract schemas", () => {
  it("accepts a visible daily dashboard response with exact aggregate values", () => {
    const result = DashboardDailySchema.parse({
      team_id: "tm_product",
      date: "2026-06-18",
      privacy: {
        visibility: "visible",
        reasons: [],
        thresholds: DASHBOARD_THRESHOLDS,
      },
      summary: {
        total_submissions: {
          kind: "exact",
          value: 8,
        },
        mood_distribution: [
          {
            mood_type: "happy",
            count: {
              kind: "exact",
              value: 4,
            },
          },
          {
            mood_type: "focused",
            count: {
              kind: "exact",
              value: 4,
            },
          },
        ],
        alert_state: {
          status: "inactive",
          message: null,
        },
      },
      hourly_buckets: Array.from({ length: 24 }, (_, hourOfDay) => ({
        hour_of_day: hourOfDay,
        privacy: {
          visibility: "visible",
          reasons: [],
          thresholds: DASHBOARD_THRESHOLDS,
        },
        total_submissions: {
          kind: "exact",
          value: hourOfDay === 9 ? 4 : hourOfDay === 14 ? 4 : 0,
        },
        average_mood_score: {
          kind: "exact",
          value: hourOfDay === 9 ? 7 : hourOfDay === 14 ? 6 : 5,
        },
        mood_counts: [],
      })),
    });

    expect(result.hourly_buckets).toHaveLength(24);
    expect(result.summary.total_submissions).toEqual({
      kind: "exact",
      value: 8,
    });
  });

  it("accepts blurred weekly and tags responses when team size is below the precise threshold", () => {
    const weeklyResult = DashboardWeeklySchema.parse({
      team_id: "tm_product",
      window: {
        start_date: "2026-06-15",
        end_date: "2026-06-21",
      },
      privacy: {
        visibility: "blurred",
        reasons: ["minimum_members_for_precise_values"],
        thresholds: DASHBOARD_THRESHOLDS,
      },
      summary: {
        total_submissions: {
          kind: "range",
          min: 5,
          max: 9,
        },
        mood_distribution: [
          {
            mood_type: "stressed",
            count: {
              kind: "range",
              min: 2,
              max: 4,
            },
          },
        ],
        alert_state: {
          status: "active",
          message: "Team mood alert available.",
        },
      },
      daily_points: Array.from({ length: 7 }, (_, index) => ({
        date: `2026-06-${String(index + 15).padStart(2, "0")}`,
        privacy: {
          visibility: "blurred",
          reasons: ["minimum_members_for_precise_values"],
          thresholds: DASHBOARD_THRESHOLDS,
        },
        total_submissions: {
          kind: "range",
          min: 1,
          max: 2,
        },
        average_mood_score: {
          kind: "range",
          min: 4,
          max: 6,
        },
      })),
    });

    const tagsResult = DashboardTagsSchema.parse({
      team_id: "tm_product",
      window: {
        start_date: "2026-06-15",
        end_date: "2026-06-21",
      },
      privacy: {
        visibility: "blurred",
        reasons: ["minimum_members_for_precise_values"],
        thresholds: DASHBOARD_THRESHOLDS,
      },
      summary: {
        total_submissions: {
          kind: "range",
          min: 5,
          max: 9,
        },
        mood_distribution: [
          {
            mood_type: "stressed",
            count: {
              kind: "range",
              min: 2,
              max: 4,
            },
          },
        ],
        alert_state: {
          status: "inactive",
          message: null,
        },
      },
      tag_counts: [
        {
          tag: "#workload",
          count: {
            kind: "range",
            min: 2,
            max: 4,
          },
        },
      ],
    });

    expect(weeklyResult.privacy.visibility).toBe("blurred");
    expect(tagsResult.tag_counts[0]?.count.kind).toBe("range");
  });

  it("accepts hidden responses when submission thresholds are not met", () => {
    const result = DashboardDailySchema.parse({
      team_id: "tm_product",
      date: "2026-06-18",
      privacy: {
        visibility: "hidden",
        reasons: ["minimum_submissions"],
        thresholds: DASHBOARD_THRESHOLDS,
      },
      summary: {
        total_submissions: {
          kind: "hidden",
        },
        mood_distribution: [],
        alert_state: {
          status: "hidden",
          message: null,
        },
      },
      hourly_buckets: Array.from({ length: 24 }, (_, hourOfDay) => ({
        hour_of_day: hourOfDay,
        privacy: {
          visibility: "hidden",
          reasons:
            hourOfDay === 10
              ? ["minimum_hourly_submissions"]
              : ["minimum_submissions"],
          thresholds: DASHBOARD_THRESHOLDS,
        },
        total_submissions: {
          kind: "hidden",
        },
        average_mood_score: {
          kind: "hidden",
        },
        mood_counts: [],
      })),
    });

    expect(result.summary.alert_state.status).toBe("hidden");
    expect(result.hourly_buckets[10]?.privacy.reasons).toContain(
      "minimum_hourly_submissions",
    );
  });

  it("rejects invalid alert payloads that expose a message without an active state", () => {
    expect(() =>
      DashboardTagsSchema.parse({
        team_id: "tm_product",
        window: {
          start_date: "2026-06-15",
          end_date: "2026-06-21",
        },
        privacy: {
          visibility: "visible",
          reasons: [],
          thresholds: DASHBOARD_THRESHOLDS,
        },
        summary: {
          total_submissions: {
            kind: "exact",
            value: 7,
          },
          mood_distribution: [],
          alert_state: {
            status: "inactive",
            message: "This should not be allowed.",
          },
        },
        tag_counts: [],
      }),
    ).toThrow("inactive or hidden alert state must not include a message");
  });
});
