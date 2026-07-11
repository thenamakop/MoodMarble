import { render, waitFor } from "@testing-library/react-native";

import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { WeeklyTrendChart } from "@/features/dashboard/weekly-trend-chart";

type WeeklyPoint = ManagerDashboardViewModel["weeklyTrend"]["data"][number];

function createData(
  values: Array<{ label: string; scoreValue: number | null; scoreLabel: string }>,
): WeeklyPoint[] {
  return values.map(({ label, scoreValue, scoreLabel }) => ({
    label,
    date: `2026-${label}`,
    scoreValue,
    scoreLabel,
    visibility: "visible" as const,
  }));
}

const VISIBLE_DATA = createData([
  { label: "06-15", scoreValue: 5, scoreLabel: "5" },
  { label: "06-16", scoreValue: 7, scoreLabel: "7" },
  { label: "06-17", scoreValue: 8, scoreLabel: "8" },
  { label: "06-18", scoreValue: 6.8, scoreLabel: "6.8" },
  { label: "06-19", scoreValue: 5, scoreLabel: "5" },
  { label: "06-20", scoreValue: 5, scoreLabel: "5" },
  { label: "06-21", scoreValue: 5, scoreLabel: "5" },
]);

function getTextContent(element: unknown): string {
  if (element === null || element === undefined) return "";
  if (typeof element === "string") return element;
  if (Array.isArray(element)) return element.map(getTextContent).join("");
  const node = element as { props?: { children?: unknown } };
  return node.props?.children ? getTextContent(node.props.children) : "";
}

describe("WeeklyTrendChart", () => {
  it("renders a value label above every visible data point", async () => {
    const view = await render(<WeeklyTrendChart data={VISIBLE_DATA} width={360} />);

    await waitFor(() => {
      for (const point of VISIBLE_DATA) {
        const label = view.getByTestId(`manager-dashboard-weekly-label-${point.date}`);
        expect(getTextContent(label)).toBe(point.scoreLabel);
      }
    });
  });

  it("does not render a label for hidden (null scoreValue) points", async () => {
    const data = createData([
      { label: "06-15", scoreValue: 5, scoreLabel: "5" },
      { label: "06-16", scoreValue: null, scoreLabel: "HIDDEN" },
      { label: "06-17", scoreValue: 8, scoreLabel: "8" },
    ]);

    const view = await render(<WeeklyTrendChart data={data} width={360} />);

    await waitFor(() => {
      expect(getTextContent(view.getByTestId("manager-dashboard-weekly-label-2026-06-15"))).toBe(
        "5",
      );
      expect(getTextContent(view.getByTestId("manager-dashboard-weekly-label-2026-06-17"))).toBe(
        "8",
      );
      expect(view.queryByTestId("manager-dashboard-weekly-label-2026-06-16")).toBeNull();
    });
  });
});
