import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ManagerDashboardCharts } from "@/features/dashboard/dashboard-charts";

jest.mock("react-native-svg", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, View } = require("react-native");

  const Svg = ({
    children,
    width,
    height,
    testID,
  }: {
    children?: React.ReactNode;
    width?: number;
    height?: number;
    testID?: string;
  }) => (
    <View testID={testID} style={{ width, height }}>
      {children}
    </View>
  );

  const SvgText = ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>;

  return {
    __esModule: true,
    default: Svg,
    Svg,
    Circle: () => null,
    Line: () => null,
    Polyline: () => null,
    Text: SvgText,
  };
});

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    background: "#ffffff",
    backgroundElement: "#f3f4f6",
    backgroundSelected: "#dbeafe",
    text: "#111827",
    textSecondary: "#6b7280",
  }),
}));

jest.mock("lucide-react-native", () => ({
  Maximize2: () => null,
  X: () => null,
}));

describe("ManagerDashboardCharts (mobile)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all chart cards and the distribution list", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    expect(view.getByTestId("manager-dashboard-daily-card")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-weekly-card")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-distribution-card")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-volume-card")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-tags-card")).toBeTruthy();

    expect(view.getByText("Daily heatmap")).toBeTruthy();
    expect(view.getByText("Weekly trend")).toBeTruthy();
    expect(view.getByText("Mood distribution")).toBeTruthy();
    expect(view.getByText("Submission volume")).toBeTruthy();
    expect(view.getByText("Tag frequency")).toBeTruthy();

    expect(view.getByText("Happy")).toBeTruthy();
    expect(view.getByText("Focused")).toBeTruthy();
    expect(view.getByText("Neutral")).toBeTruthy();
  });

  it("sizes the weekly trend chart to the measured card width", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    fireEvent(view.getByTestId("manager-dashboard-weekly-card-width-provider"), "layout", {
      nativeEvent: { layout: { width: 360 } },
    });

    await waitFor(() =>
      expect(view.getByTestId("manager-dashboard-weekly-svg").props.style.width).toBe(360),
    );
  });

  it("renders the weekly trend chart with labels and the last point label", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    expect(view.getByTestId("manager-dashboard-weekly-svg")).toBeTruthy();
    expect(view.getAllByText("06-15").length).toBeGreaterThan(0);
    expect(view.getAllByText("06-21").length).toBeGreaterThan(0);
    expect(view.getAllByText("8").length).toBeGreaterThan(0);
  });

  it("renders the distribution chart as a ranked list with percentages", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    expect(view.getByText("Happy")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-distribution-happy-percentage")).toHaveTextContent(
      "33%",
    );
    expect(view.getByTestId("manager-dashboard-distribution-focused-percentage")).toHaveTextContent(
      "33%",
    );
    expect(view.getByTestId("manager-dashboard-distribution-neutral-percentage")).toHaveTextContent(
      "33%",
    );
  });

  it("renders the submission volume bars", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    expect(view.getByTestId("manager-dashboard-volume-bars")).toBeTruthy();
    expect(view.getAllByText("5").length).toBeGreaterThan(0);
  });

  it("renders the tag frequency horizontal bars", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    expect(view.getByTestId("manager-dashboard-tags-bars")).toBeTruthy();
    expect(view.getByText("#workload")).toBeTruthy();
    expect(view.getByText("#management")).toBeTruthy();
  });

  it("renders an expand trigger only on Weekly Trend, Submission Volume, and Tag Frequency", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    // Expandable cards.
    expect(view.getByTestId("manager-dashboard-weekly-card-expand-trigger")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-volume-card-expand-trigger")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-tags-card-expand-trigger")).toBeTruthy();

    // Non-expandable cards.
    expect(view.queryByTestId("manager-dashboard-daily-card-expand-trigger")).toBeNull();
    expect(view.queryByTestId("manager-dashboard-distribution-card-expand-trigger")).toBeNull();
  });

  it("opens and closes the expanded modal when an expandable card's trigger is tapped", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    fireEvent.press(view.getByTestId("manager-dashboard-weekly-card-expand-trigger"));

    await waitFor(() =>
      expect(view.getByTestId("manager-dashboard-weekly-card-expand-close")).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId("manager-dashboard-weekly-card-expand-close"));

    await waitFor(() =>
      expect(view.queryByTestId("manager-dashboard-weekly-card-expand-close")).toBeNull(),
    );
  });

  it("does not render an expand trigger on a hidden privacy fallback card", async () => {
    const base = createViewModel();
    const hiddenViewModel = {
      ...base,
      weeklyTrend: {
        ...base.weeklyTrend,
        visibility: "hidden" as const,
        hiddenMessage: "The weekly trend is hidden until privacy thresholds are met.",
      },
    };

    const view = await render(<ManagerDashboardCharts viewModel={hiddenViewModel} />);
    await waitFor(() => expect(view.getByText("Weekly trend")).toBeTruthy());

    expect(view.getByTestId("manager-dashboard-weekly-card-hidden")).toBeTruthy();
    expect(view.queryByTestId("manager-dashboard-weekly-card-expand-icon")).toBeNull();
  });

  it("renders the redesigned daily heatmap as a 2x12 grid with AM and PM rows", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    expect(view.getByTestId("manager-dashboard-daily-grid")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-daily-cell-0-0")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-daily-cell-1-11")).toBeTruthy();
    expect(view.getByText("AM")).toBeTruthy();
    expect(view.getByText("PM")).toBeTruthy();
  });

  it("colors hidden daily heatmap cells with the neutral gray", async () => {
    const view = await render(<ManagerDashboardCharts viewModel={createViewModel()} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    // Hour 13 is in the PM row (index 13 - 12 = 1) and is hidden in the fixture.
    const cell = view.getByTestId("manager-dashboard-daily-cell-1-1");
    const backgroundColor = cell.props.style.find(
      (s: Record<string, unknown>) => s?.backgroundColor !== undefined,
    )?.backgroundColor;
    expect(backgroundColor).toBe("#9ca3af");
  });

  it("renders the hidden privacy fallback when a chart is below threshold", async () => {
    const base = createViewModel();
    const hiddenViewModel = {
      ...base,
      dailyHeatmap: {
        ...base.dailyHeatmap,
        visibility: "hidden" as const,
        hiddenMessage: "The daily heatmap is hidden until privacy thresholds are met.",
      },
    };

    const view = await render(<ManagerDashboardCharts viewModel={hiddenViewModel} />);
    await waitFor(() => expect(view.getByText("Daily heatmap")).toBeTruthy());

    expect(view.getByTestId("manager-dashboard-daily-card-hidden")).toBeTruthy();
    expect(view.getByText("Hidden by privacy threshold")).toBeTruthy();
    expect(
      view.getByText("The daily heatmap is hidden until privacy thresholds are met."),
    ).toBeTruthy();
  });
});

function createViewModel() {
  return {
    summary: {
      totalSubmissionsLabel: "9",
      windowLabel: "2026-06-15 to 2026-06-21",
    },
    banner: null,
    dailyHeatmap: {
      visibility: "visible" as const,
      hiddenMessage: null,
      thresholdMessage: null,
      data: Array.from({ length: 24 }, (_, hour) => ({
        hourLabel: formatHour(hour),
        hourOfDay: hour,
        scoreValue: hour === 14 ? 6 : 0,
        scoreLabel: hour === 14 ? "6" : "0",
        submissionsLabel: hour === 14 ? "3" : "0",
        visibility: (hour === 14 ? "visible" : "hidden") as "visible" | "blurred" | "hidden",
      })),
    },
    weeklyTrend: {
      visibility: "visible" as const,
      hiddenMessage: null,
      thresholdMessage: null,
      data: ["06-15", "06-16", "06-17", "06-18", "06-19", "06-20", "06-21"].map((label, index) => ({
        label,
        date: `2026-${label}`,
        scoreValue: [5, 7, 8, 6.8, 5, 5, 5][index],
        scoreLabel: String([5, 7, 8, 6.8, 5, 5, 5][index]),
        visibility: "visible" as const,
      })),
    },
    submissionVolume: {
      visibility: "visible" as const,
      hiddenMessage: null,
      thresholdMessage: null,
      data: (
        [
          ["06-15", 0],
          ["06-16", 2],
          ["06-17", 2],
          ["06-18", 5],
          ["06-19", 0],
          ["06-20", 0],
          ["06-21", 0],
        ] as [string, number][]
      ).map(([label, totalValue]) => ({
        label,
        date: `2026-${label}`,
        totalValue,
        totalLabel: String(totalValue),
        visibility: "visible" as const,
      })),
    },
    moodDistribution: {
      visibility: "visible" as const,
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        {
          moodType: "happy" as const,
          label: "Happy",
          value: 3,
          valueLabel: "3",
          color: "#22c55e",
          visibility: "visible" as const,
        },
        {
          moodType: "focused" as const,
          label: "Focused",
          value: 3,
          valueLabel: "3",
          color: "#4f46e5",
          visibility: "visible" as const,
        },
        {
          moodType: "neutral" as const,
          label: "Neutral",
          value: 3,
          valueLabel: "3",
          color: "#9ca3af",
          visibility: "visible" as const,
        },
      ],
    },
    tagFrequency: {
      visibility: "visible" as const,
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        {
          tag: "#workload" as const,
          value: 4,
          valueLabel: "4",
          visibility: "visible" as const,
        },
        {
          tag: "#team" as const,
          value: 4,
          valueLabel: "4",
          visibility: "visible" as const,
        },
        {
          tag: "#management" as const,
          value: 1,
          valueLabel: "1",
          visibility: "visible" as const,
        },
      ],
    },
  };
}

function formatHour(hour: number) {
  if (hour === 0) {
    return "12a";
  }

  if (hour < 12) {
    return `${hour}a`;
  }

  if (hour === 12) {
    return "12p";
  }

  return `${hour - 12}p`;
}
