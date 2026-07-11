import { buildManagerExportCsv, buildManagerExportFileName } from "@/features/dashboard/export";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";

function createViewModel(): ManagerDashboardViewModel {
  return {
    summary: {
      totalSubmissionsLabel: "10",
      windowLabel: "2026-06-15 to 2026-06-21",
    },
    banner: null,
    dailyHeatmap: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        {
          hourLabel: "00:00",
          hourOfDay: 0,
          scoreValue: 3,
          scoreLabel: "3",
          submissionsLabel: "1",
          visibility: "visible",
        },
        {
          hourLabel: "01:00",
          hourOfDay: 1,
          scoreValue: null,
          scoreLabel: "",
          submissionsLabel: "0",
          visibility: "hidden",
        },
      ],
    },
    weeklyTrend: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        {
          label: "06-15",
          date: "2026-06-15",
          scoreValue: 5,
          scoreLabel: "5",
          visibility: "visible",
        },
        {
          label: "06-16",
          date: "2026-06-16",
          scoreValue: null,
          scoreLabel: "",
          visibility: "hidden",
        },
      ],
    },
    submissionVolume: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [],
    },
    moodDistribution: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [],
    },
    tagFrequency: {
      visibility: "visible",
      hiddenMessage: null,
      thresholdMessage: null,
      data: [
        { tag: "#workload", value: 5, valueLabel: "5", visibility: "visible" },
        { tag: '#quote"value', value: 2, valueLabel: "2", visibility: "visible" },
      ],
    },
  };
}

describe("buildManagerExportCsv", () => {
  it("renders visible values and leaves hidden values blank", () => {
    const csv = buildManagerExportCsv({
      viewModel: createViewModel(),
      teamLabel: "Product",
      windowStartDate: "2026-06-15",
      windowEndDate: "2026-06-21",
    });

    expect(csv).toContain("Product");
    expect(csv).toContain("2026-06-15 to 2026-06-21");
    expect(csv).toContain("aggregate analytics only");
    expect(csv).toContain("00:00,3,visible");
    expect(csv).toContain("01:00,,hidden");
    expect(csv).toContain("2026-06-15,5,visible");
    expect(csv).toContain("2026-06-16,,hidden");
  });

  it("escapes tags containing commas or quotes", () => {
    const csv = buildManagerExportCsv({
      viewModel: createViewModel(),
      teamLabel: "Product",
      windowStartDate: "2026-06-15",
      windowEndDate: "2026-06-21",
    });

    expect(csv).toContain("#workload,5");
    expect(csv).toContain('"#quote""value",2');
  });
});

describe("buildManagerExportFileName", () => {
  it("sanitizes the team label and includes the window", () => {
    expect(
      buildManagerExportFileName({
        teamLabel: "Product Team",
        windowStartDate: "2026-06-15",
        windowEndDate: "2026-06-21",
      }),
    ).toBe("moodmarble-product-team-2026-06-15-to-2026-06-21.csv");
  });
});
