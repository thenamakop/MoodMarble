import { render } from "@testing-library/react-native";

import { ManagerDashboardCharts } from "@/features/dashboard/dashboard-charts.web";

jest.mock("victory", () => {
  const React = require("react");
  const { Text, View } = require("react-native");

  function ChartContainer({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) {
    return <View testID={testID}>{children}</View>;
  }

  return {
    VictoryAxis: ({ tickValues }: { tickValues?: string[] }) => (
      <ChartContainer>
        {tickValues?.map((value) => (
          <Text key={value}>{value}</Text>
        ))}
      </ChartContainer>
    ),
    VictoryBar: ({
      data,
    }: {
      data?: Array<{ label?: string; x?: string; y?: number }>;
    }) => (
      <ChartContainer>
        {data?.map((datum, index) => (
          <Text key={`${datum.x ?? datum.label ?? "bar"}-${index}`}>
            {datum.label ?? datum.x}
          </Text>
        ))}
      </ChartContainer>
    ),
    VictoryChart: ChartContainer,
    VictoryLine: ({
      data,
    }: {
      data?: Array<{ label?: string; x?: string }>;
    }) => (
      <ChartContainer>
        {data?.map((datum, index) => (
          <Text key={`${datum.x ?? datum.label ?? "line"}-${index}`}>
            {datum.label ?? datum.x}
          </Text>
        ))}
      </ChartContainer>
    ),
    VictoryPie: ({ data }: { data?: Array<{ x?: string }> }) => (
      <ChartContainer>
        {data?.map((datum, index) => (
          <Text key={`${datum.x ?? "slice"}-${index}`}>{datum.x}</Text>
        ))}
      </ChartContainer>
    ),
    VictoryScatter: ({ data }: { data?: Array<{ label?: string }> }) => (
      <ChartContainer>
        {data?.map((datum, index) => (
          <Text key={`${datum.label ?? "point"}-${index}`}>{datum.label}</Text>
        ))}
      </ChartContainer>
    ),
    VictoryTheme: {
      clean: {},
    },
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

describe("ManagerDashboardCharts (web)", () => {
  it("renders the aggregate manager chart cards without crashing on web", async () => {
    const view = await render(
      <ManagerDashboardCharts viewModel={createViewModel()} />,
    );

    expect(view.getByTestId("manager-dashboard-daily-card")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-weekly-card")).toBeTruthy();
    expect(
      view.getByTestId("manager-dashboard-distribution-card"),
    ).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-volume-card")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-tags-card")).toBeTruthy();
    expect(view.getByText("Daily heatmap")).toBeTruthy();
    expect(view.getByText("Weekly trend")).toBeTruthy();
    expect(view.getByText("Mood distribution")).toBeTruthy();
    expect(view.getByText("Submission volume")).toBeTruthy();
    expect(view.getByText("Tag frequency")).toBeTruthy();
  });

  it("renders the hidden privacy fallback when a chart is below threshold", async () => {
    const hiddenViewModel = createViewModel();
    hiddenViewModel.dailyHeatmap.visibility = "hidden";
    hiddenViewModel.dailyHeatmap.hiddenMessage =
      "The daily heatmap is hidden until privacy thresholds are met.";

    const view = await render(
      <ManagerDashboardCharts viewModel={hiddenViewModel} />,
    );

    expect(
      view.getByTestId("manager-dashboard-daily-card-hidden"),
    ).toBeTruthy();
    expect(view.getByText("Hidden by privacy threshold")).toBeTruthy();
    expect(
      view.getByText(
        "The daily heatmap is hidden until privacy thresholds are met.",
      ),
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
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: Array.from({ length: 24 }, (_, hour) => ({
        hourLabel: formatHour(hour),
        hourOfDay: hour,
        scoreValue: hour === 14 ? 6 : 0,
        scoreLabel: hour === 14 ? "6" : "0",
        submissionsLabel: hour === 14 ? "3" : "0",
        visibility: hour === 14 ? "visible" : "hidden",
      })),
    },
    weeklyTrend: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: ["06-15", "06-16", "06-17", "06-18", "06-19", "06-20", "06-21"].map(
        (label, index) => ({
          label,
          date: `2026-${label}`,
          scoreValue: [5, 7, 8, 6.8, 5, 5, 5][index],
          scoreLabel: String([5, 7, 8, 6.8, 5, 5, 5][index]),
          visibility: "visible",
        }),
      ),
    },
    submissionVolume: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        ["06-15", 0],
        ["06-16", 2],
        ["06-17", 2],
        ["06-18", 5],
        ["06-19", 0],
        ["06-20", 0],
        ["06-21", 0],
      ].map(([label, totalValue]) => ({
        label,
        date: `2026-${label}`,
        totalValue,
        totalLabel: String(totalValue),
        visibility: "visible",
      })),
    },
    moodDistribution: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        {
          moodType: "happy",
          label: "Happy",
          value: 3,
          valueLabel: "3",
          color: "#22c55e",
          visibility: "visible",
        },
        {
          moodType: "focused",
          label: "Focused",
          value: 3,
          valueLabel: "3",
          color: "#4f46e5",
          visibility: "visible",
        },
        {
          moodType: "neutral",
          label: "Neutral",
          value: 3,
          valueLabel: "3",
          color: "#9ca3af",
          visibility: "visible",
        },
      ],
    },
    tagFrequency: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        {
          tag: "#workload",
          value: 4,
          valueLabel: "4",
          visibility: "visible",
        },
        {
          tag: "#team",
          value: 4,
          valueLabel: "4",
          visibility: "visible",
        },
        {
          tag: "#management",
          value: 1,
          valueLabel: "1",
          visibility: "visible",
        },
      ],
    },
  } as const;
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
