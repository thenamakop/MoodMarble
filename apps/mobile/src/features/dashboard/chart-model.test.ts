import {
  buildManagerDashboardViewModel,
  getChartScoreValue,
} from "@/features/dashboard/chart-model";

describe("buildManagerDashboardViewModel", () => {
  it("maps backend dashboard responses into stable chart buckets", () => {
    const viewModel = buildManagerDashboardViewModel(createVisibleBundle());

    expect(viewModel.summary.totalSubmissionsLabel).toBe("12");
    expect(viewModel.dailyHeatmap.data).toHaveLength(24);
    expect(viewModel.dailyHeatmap.data[0]).toMatchObject({
      hourLabel: "12a",
      scoreLabel: "0",
      submissionsLabel: "0",
      visibility: "visible",
    });
    expect(viewModel.dailyHeatmap.data[9]).toMatchObject({
      hourLabel: "9a",
      scoreLabel: "7",
      submissionsLabel: "4",
      visibility: "visible",
    });
    expect(viewModel.dailyHeatmap.data[14]).toMatchObject({
      hourLabel: "2p",
      scoreLabel: "Hidden",
      submissionsLabel: "Hidden",
      visibility: "hidden",
    });

    expect(viewModel.weeklyTrend.data.map((point) => point.label)).toEqual([
      "06-15",
      "06-16",
      "06-17",
      "06-18",
      "06-19",
      "06-20",
      "06-21",
    ]);
    expect(viewModel.submissionVolume.data[0]).toMatchObject({
      totalValue: 2,
      totalLabel: "2",
    });
    expect(viewModel.moodDistribution.data[0]).toMatchObject({
      label: "Happy",
      value: 5,
      valueLabel: "5",
    });
    expect(viewModel.tagFrequency.data.map((bar) => bar.tag)).toEqual([
      "#workload",
      "#team",
      "#management",
    ]);
  });

  it("returns null scoreValue for privacy-hidden weekly trend points", () => {
    const bundle = createVisibleBundle();
    // Override one day to be privacy-hidden. Cast through unknown to bypass
    // the narrow literal types inferred by the factory function — this is
    // intentional test data that simulates a real hidden API response.
    (bundle.weekly.daily_points as unknown[])[4] = {
      date: "2026-06-19",
      privacy: hiddenPrivacy(["minimum_hourly_submissions"]),
      total_submissions: { kind: "hidden" as const },
      average_mood_score: { kind: "hidden" as const },
    };

    const viewModel = buildManagerDashboardViewModel(bundle);

    // The hidden day should have scoreValue: null, not 0
    expect(viewModel.weeklyTrend.data[4].scoreValue).toBeNull();
    // Visible days should still have their numeric values
    expect(viewModel.weeklyTrend.data[0].scoreValue).toBe(5);
    expect(viewModel.weeklyTrend.data[3].scoreValue).toBe(6.5);
  });

  it("returns null scoreValue for privacy-hidden daily heatmap cells", () => {
    const viewModel = buildManagerDashboardViewModel(createVisibleBundle());

    // hour 14 is hidden in createVisibleBundle
    expect(viewModel.dailyHeatmap.data[14].scoreValue).toBeNull();
    expect(viewModel.dailyHeatmap.data[14].visibility).toBe("hidden");

    // Visible hours should have numeric values
    expect(viewModel.dailyHeatmap.data[9].scoreValue).toBe(7);
  });

  it("preserves hidden privacy state for chart fallbacks", () => {
    const viewModel = buildManagerDashboardViewModel(createHiddenBundle());

    expect(viewModel.banner).toEqual({
      kind: "privacy",
      title: "Privacy threshold active",
      message:
        "Some dashboard widgets remain hidden until the minimum anonymous sample size is reached.",
    });
    expect(viewModel.dailyHeatmap.visibility).toBe("hidden");
    expect(viewModel.dailyHeatmap.hiddenMessage).toContain("hidden");
    expect(viewModel.weeklyTrend.visibility).toBe("hidden");
    expect(viewModel.tagFrequency.visibility).toBe("hidden");
  });
});

function createVisibleBundle() {
  return {
    daily: {
      team_id: "tm_product",
      date: "2026-06-18",
      privacy: visiblePrivacy(),
      summary: {
        total_submissions: { kind: "exact" as const, value: 12 },
        mood_distribution: [
          {
            mood_type: "happy" as const,
            count: { kind: "exact" as const, value: 5 },
          },
          {
            mood_type: "focused" as const,
            count: { kind: "exact" as const, value: 4 },
          },
          {
            mood_type: "stressed" as const,
            count: { kind: "exact" as const, value: 3 },
          },
        ],
        alert_state: { status: "inactive" as const, message: null },
      },
      hourly_buckets: Array.from({ length: 24 }, (_, hourOfDay) => ({
        hour_of_day: hourOfDay,
        privacy:
          hourOfDay === 14 ? hiddenPrivacy(["minimum_hourly_submissions"]) : visiblePrivacy(),
        total_submissions:
          hourOfDay === 9
            ? { kind: "exact" as const, value: 4 }
            : hourOfDay === 14
              ? { kind: "hidden" as const }
              : { kind: "exact" as const, value: 0 },
        average_mood_score:
          hourOfDay === 9
            ? { kind: "exact" as const, value: 7 }
            : hourOfDay === 14
              ? { kind: "hidden" as const }
              : { kind: "exact" as const, value: 0 },
        mood_counts: [],
      })),
    },
    weekly: {
      team_id: "tm_product",
      window: {
        start_date: "2026-06-15",
        end_date: "2026-06-21",
      },
      privacy: visiblePrivacy(),
      summary: {
        total_submissions: { kind: "exact" as const, value: 12 },
        mood_distribution: [
          {
            mood_type: "happy" as const,
            count: { kind: "exact" as const, value: 5 },
          },
          {
            mood_type: "focused" as const,
            count: { kind: "exact" as const, value: 4 },
          },
          {
            mood_type: "stressed" as const,
            count: { kind: "exact" as const, value: 3 },
          },
        ],
        alert_state: { status: "inactive" as const, message: null },
      },
      daily_points: [
        { date: "2026-06-15", count: 2, score: 5 },
        { date: "2026-06-16", count: 1, score: 4.5 },
        { date: "2026-06-17", count: 2, score: 5.5 },
        { date: "2026-06-18", count: 3, score: 6.5 },
        { date: "2026-06-19", count: 0, score: 0 },
        { date: "2026-06-20", count: 2, score: 7 },
        { date: "2026-06-21", count: 2, score: 8 },
      ].map((point) => ({
        date: point.date,
        privacy: visiblePrivacy(),
        total_submissions: { kind: "exact" as const, value: point.count },
        average_mood_score: { kind: "exact" as const, value: point.score },
      })),
    },
    tags: {
      team_id: "tm_product",
      window: {
        start_date: "2026-06-15",
        end_date: "2026-06-21",
      },
      privacy: visiblePrivacy(),
      summary: {
        total_submissions: { kind: "exact" as const, value: 12 },
        mood_distribution: [
          {
            mood_type: "happy" as const,
            count: { kind: "exact" as const, value: 5 },
          },
          {
            mood_type: "focused" as const,
            count: { kind: "exact" as const, value: 4 },
          },
          {
            mood_type: "stressed" as const,
            count: { kind: "exact" as const, value: 3 },
          },
        ],
        alert_state: { status: "inactive" as const, message: null },
      },
      tag_counts: [
        {
          tag: "#workload" as const,
          count: { kind: "exact" as const, value: 6 },
        },
        { tag: "#team" as const, count: { kind: "exact" as const, value: 4 } },
        {
          tag: "#management" as const,
          count: { kind: "exact" as const, value: 2 },
        },
      ],
    },
  };
}

function createHiddenBundle() {
  const visibleBundle = createVisibleBundle();

  return {
    daily: {
      ...visibleBundle.daily,
      privacy: hiddenPrivacy(["minimum_submissions"]),
      summary: {
        ...visibleBundle.daily.summary,
        total_submissions: { kind: "hidden" as const },
        alert_state: { status: "hidden" as const, message: null },
      },
    },
    weekly: {
      ...visibleBundle.weekly,
      privacy: hiddenPrivacy(["minimum_submissions"]),
      summary: {
        ...visibleBundle.weekly.summary,
        total_submissions: { kind: "hidden" as const },
        alert_state: { status: "hidden" as const, message: null },
      },
    },
    tags: {
      ...visibleBundle.tags,
      privacy: hiddenPrivacy(["minimum_submissions"]),
      summary: {
        ...visibleBundle.tags.summary,
        total_submissions: { kind: "hidden" as const },
        alert_state: { status: "hidden" as const, message: null },
      },
      tag_counts: [{ tag: "#workload" as const, count: { kind: "hidden" as const } }],
    },
  };
}

function visiblePrivacy() {
  return {
    visibility: "visible" as const,
    reasons: [],
    thresholds: {
      minimum_submissions: 5 as const,
      minimum_members_for_precise_values: 5 as const,
      minimum_hourly_submissions: 3 as const,
    },
  };
}

function hiddenPrivacy(reasons: ("minimum_submissions" | "minimum_hourly_submissions")[]) {
  return {
    visibility: "hidden" as const,
    reasons,
    thresholds: {
      minimum_submissions: 5 as const,
      minimum_members_for_precise_values: 5 as const,
      minimum_hourly_submissions: 3 as const,
    },
  };
}
