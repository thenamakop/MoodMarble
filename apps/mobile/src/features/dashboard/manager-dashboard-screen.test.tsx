import { render } from "@testing-library/react-native";

import { buildManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { ManagerDashboardScreen } from "@/features/dashboard/manager-dashboard-screen";

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    background: "#ffffff",
    backgroundElement: "#f3f4f6",
    backgroundSelected: "#d1d5db",
    text: "#111111",
    textSecondary: "#6b7280",
  }),
}));

jest.mock("victory-native", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    VictoryAxis: jest.fn(() => <View />),
    VictoryBar: jest.fn(({ testID }: { testID?: string }) => (
      <View testID={testID ?? "victory-bar"} />
    )),
    VictoryChart: jest.fn(
      ({
        children,
        testID,
      }: {
        children?: React.ReactNode;
        testID?: string;
      }) => <View testID={testID ?? "victory-chart"}>{children}</View>,
    ),
    VictoryLine: jest.fn(({ testID }: { testID?: string }) => (
      <View testID={testID ?? "victory-line"} />
    )),
    VictoryPie: jest.fn(({ testID }: { testID?: string }) => (
      <View testID={testID ?? "victory-pie"} />
    )),
    VictoryScatter: jest.fn(({ testID }: { testID?: string }) => (
      <View testID={testID ?? "victory-scatter"} />
    )),
    VictoryTheme: {
      clean: {},
    },
  };
});

const { VictoryBar, VictoryLine, VictoryPie, VictoryScatter } =
  jest.requireMock("victory-native") as {
    VictoryBar: jest.Mock;
    VictoryLine: jest.Mock;
    VictoryPie: jest.Mock;
    VictoryScatter: jest.Mock;
  };

describe("ManagerDashboardScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the manager dashboard shell with its control placeholders", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "ready" }} />,
    );

    expect(view.getByTestId("manager-dashboard-screen")).toBeTruthy();
    expect(view.getByText("Manager dashboard")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-date-picker")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-team-selector")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-export-button")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-ready-state")).toBeTruthy();
  });

  it("renders the loading state", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "loading" }} />,
    );

    expect(view.getByTestId("manager-dashboard-loading-state")).toBeTruthy();
    expect(view.getByText("Loading dashboard")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "empty" }} />,
    );

    expect(view.getByTestId("manager-dashboard-empty-state")).toBeTruthy();
    expect(view.getByText("No aggregate data yet")).toBeTruthy();
  });

  it("renders the privacy-threshold state", async () => {
    const view = await render(
      <ManagerDashboardScreen
        contentState={{ kind: "privacy", visibility: "hidden" }}
      />,
    );

    expect(view.getByTestId("manager-dashboard-privacy-state")).toBeTruthy();
    expect(view.getByText("Privacy threshold active")).toBeTruthy();
  });

  it("renders the data-ready placeholders without any individual entries", async () => {
    const viewModel = buildManagerDashboardViewModel(createVisibleBundle());
    const view = await render(
      <ManagerDashboardScreen
        contentState={{ kind: "ready" }}
        viewModel={viewModel}
      />,
    );

    expect(view.getByTestId("manager-dashboard-daily-chart")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-weekly-chart")).toBeTruthy();
    expect(
      view.getByTestId("manager-dashboard-distribution-chart"),
    ).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-volume-chart")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-tags-chart")).toBeTruthy();
    expect(view.queryByText(/device token/i)).toBeNull();
    expect(view.queryByText(/joined-device-jwt/i)).toBeNull();
    expect(view.queryByText(/marble-tray:/i)).toBeNull();

    expect(VictoryScatter.mock.calls[0]?.[0].data).toHaveLength(24);
    expect(VictoryLine.mock.calls[0]?.[0].data).toHaveLength(7);
    expect(VictoryBar.mock.calls[0]?.[0].data).toHaveLength(7);
    expect(VictoryPie.mock.calls[0]?.[0].data).toHaveLength(3);
  });

  it("renders chart fallbacks when privacy thresholds hide the data", async () => {
    const viewModel = buildManagerDashboardViewModel(createHiddenBundle());
    const view = await render(
      <ManagerDashboardScreen
        contentState={{ kind: "ready" }}
        viewModel={viewModel}
      />,
    );

    expect(view.getByTestId("manager-dashboard-privacy-banner")).toBeTruthy();
    expect(
      view.getByTestId("manager-dashboard-daily-card-hidden"),
    ).toBeTruthy();
    expect(
      view.getByTestId("manager-dashboard-weekly-card-hidden"),
    ).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-tags-card-hidden")).toBeTruthy();
    expect(VictoryScatter).not.toHaveBeenCalled();
    expect(VictoryLine).not.toHaveBeenCalled();
  });
});

function createVisibleBundle() {
  return {
    daily: {
      team_id: "tm_product",
      date: "2026-06-18",
      privacy: visiblePrivacy(),
      summary: {
        total_submissions: { kind: "exact" as const, value: 8 },
        mood_distribution: [
          {
            mood_type: "happy" as const,
            count: { kind: "exact" as const, value: 3 },
          },
          {
            mood_type: "focused" as const,
            count: { kind: "exact" as const, value: 3 },
          },
          {
            mood_type: "stressed" as const,
            count: { kind: "exact" as const, value: 2 },
          },
        ],
        alert_state: { status: "inactive" as const, message: null },
      },
      hourly_buckets: Array.from({ length: 24 }, (_, hourOfDay) => ({
        hour_of_day: hourOfDay,
        privacy:
          hourOfDay === 14
            ? hiddenPrivacy(["minimum_hourly_submissions"])
            : visiblePrivacy(),
        total_submissions:
          hourOfDay === 9
            ? { kind: "exact" as const, value: 3 }
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
        total_submissions: { kind: "exact" as const, value: 8 },
        mood_distribution: [
          {
            mood_type: "happy" as const,
            count: { kind: "exact" as const, value: 3 },
          },
          {
            mood_type: "focused" as const,
            count: { kind: "exact" as const, value: 3 },
          },
          {
            mood_type: "stressed" as const,
            count: { kind: "exact" as const, value: 2 },
          },
        ],
        alert_state: { status: "inactive" as const, message: null },
      },
      daily_points: [
        "2026-06-15",
        "2026-06-16",
        "2026-06-17",
        "2026-06-18",
        "2026-06-19",
        "2026-06-20",
        "2026-06-21",
      ].map((date, index) => ({
        date,
        privacy: visiblePrivacy(),
        total_submissions: {
          kind: "exact" as const,
          value: index === 4 ? 0 : 1 + (index % 2),
        },
        average_mood_score: { kind: "exact" as const, value: 4 + index / 2 },
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
        total_submissions: { kind: "exact" as const, value: 8 },
        mood_distribution: [
          {
            mood_type: "happy" as const,
            count: { kind: "exact" as const, value: 3 },
          },
          {
            mood_type: "focused" as const,
            count: { kind: "exact" as const, value: 3 },
          },
          {
            mood_type: "stressed" as const,
            count: { kind: "exact" as const, value: 2 },
          },
        ],
        alert_state: { status: "inactive" as const, message: null },
      },
      tag_counts: [
        {
          tag: "#workload" as const,
          count: { kind: "exact" as const, value: 4 },
        },
        { tag: "#team" as const, count: { kind: "exact" as const, value: 2 } },
        {
          tag: "#management" as const,
          count: { kind: "exact" as const, value: 1 },
        },
      ],
    },
  };
}

function createHiddenBundle() {
  return {
    daily: {
      ...createVisibleBundle().daily,
      privacy: hiddenPrivacy(["minimum_submissions"]),
      summary: {
        ...createVisibleBundle().daily.summary,
        total_submissions: { kind: "hidden" as const },
        alert_state: { status: "hidden" as const, message: null },
      },
    },
    weekly: {
      ...createVisibleBundle().weekly,
      privacy: hiddenPrivacy(["minimum_submissions"]),
      summary: {
        ...createVisibleBundle().weekly.summary,
        total_submissions: { kind: "hidden" as const },
        alert_state: { status: "hidden" as const, message: null },
      },
    },
    tags: {
      ...createVisibleBundle().tags,
      privacy: hiddenPrivacy(["minimum_submissions"]),
      summary: {
        ...createVisibleBundle().tags.summary,
        total_submissions: { kind: "hidden" as const },
        alert_state: { status: "hidden" as const, message: null },
      },
      tag_counts: [
        { tag: "#workload" as const, count: { kind: "hidden" as const } },
      ],
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

function hiddenPrivacy(
  reasons: ("minimum_submissions" | "minimum_hourly_submissions")[],
) {
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
