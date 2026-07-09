import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { DashboardMetricVisibility } from "@/contracts/dashboard";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";

interface DailyHeatmapProps {
  data: ManagerDashboardViewModel["dailyHeatmap"]["data"];
}

const HOUR_COLUMN_LABELS = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

const COLOR_STOPS: { value: number; rgb: [number, number, number] }[] = [
  { value: 0, rgb: [239, 68, 68] }, // red — poor
  { value: 2.5, rgb: [251, 146, 60] }, // orange
  { value: 5, rgb: [250, 204, 21] }, // yellow
  { value: 7.5, rgb: [132, 204, 22] }, // lime
  { value: 10, rgb: [34, 197, 94] }, // green — great
];

/**
 * Linearly interpolates a mood score (0-10) into an RGB color across
 * COLOR_STOPS, producing a continuous gradient instead of discrete
 * buckets. Mirrors what a seaborn sequential colormap does.
 */
function interpolateHeatColor(scoreValue: number): string {
  const clamped = Math.max(0, Math.min(10, scoreValue));

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const start = COLOR_STOPS[i];
    const end = COLOR_STOPS[i + 1];

    if (clamped >= start.value && clamped <= end.value) {
      const t = (clamped - start.value) / (end.value - start.value);
      const r = Math.round(start.rgb[0] + (end.rgb[0] - start.rgb[0]) * t);
      const g = Math.round(start.rgb[1] + (end.rgb[1] - start.rgb[1]) * t);
      const b = Math.round(start.rgb[2] + (end.rgb[2] - start.rgb[2]) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const last = COLOR_STOPS[COLOR_STOPS.length - 1].rgb;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

function getCellColor(scoreValue: number | null, visibility: DashboardMetricVisibility): string {
  if (visibility === "hidden" || scoreValue === null) {
    return "#9ca3af";
  }
  return interpolateHeatColor(scoreValue);
}

/**
 * Renders 24 hourly mood buckets as a 2x12 grid (AM row, PM row) with a
 * continuous color gradient, replacing the earlier single-strip design.
 */
export function DailyHeatmap({ data }: DailyHeatmapProps) {
  // Confirmed against chart-model.ts: data[0] is 12a, data[23] is 11p,
  // in chronological order.
  const amRow = data.slice(0, 12);
  const pmRow = data.slice(12, 24);

  return (
    <View testID="manager-dashboard-daily-grid">
      <HeatmapRow cells={amRow} label="AM" rowIndex={0} />
      <HeatmapRow cells={pmRow} label="PM" rowIndex={1} />
      <View style={styles.columnAxis}>
        <View style={styles.rowLabelSpacer} />
        {HOUR_COLUMN_LABELS.map((label) => (
          <ThemedText
            key={label}
            themeColor="textSecondary"
            type="small"
            style={styles.columnLabel}
          >
            {label}
          </ThemedText>
        ))}
      </View>
      <HeatmapLegend />
    </View>
  );
}

function HeatmapRow({
  cells,
  label,
  rowIndex,
}: {
  cells: ManagerDashboardViewModel["dailyHeatmap"]["data"];
  label: string;
  rowIndex: number;
}) {
  return (
    <View style={styles.row}>
      <ThemedText themeColor="textSecondary" type="smallBold" style={styles.rowLabel}>
        {label}
      </ThemedText>
      {cells.map((cell, columnIndex) => (
        <View
          key={cell.hourLabel}
          style={[styles.cell, { backgroundColor: getCellColor(cell.scoreValue, cell.visibility) }]}
          testID={`manager-dashboard-daily-cell-${rowIndex}-${columnIndex}`}
        />
      ))}
    </View>
  );
}

function HeatmapLegend() {
  // 12-step approximation of the same gradient used for cells — no new
  // dependency needed, and at this density it reads as a continuous bar.
  const steps = Array.from({ length: 12 }, (_, index) => (index / 11) * 10);

  return (
    <View style={styles.legendContainer}>
      <View style={styles.legendGradient}>
        {steps.map((value, index) => (
          <View
            key={index}
            style={[styles.legendSwatch, { backgroundColor: interpolateHeatColor(value) }]}
          />
        ))}
      </View>
      <View style={styles.legendLabels}>
        <ThemedText themeColor="textSecondary" type="small">
          Poor
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Great
        </ThemedText>
      </View>
    </View>
  );
}

const CELL_GAP = 3;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  rowLabel: {
    width: 28,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
  },
  columnAxis: {
    flexDirection: "row",
    marginTop: Spacing.one,
  },
  rowLabelSpacer: {
    width: 28,
  },
  columnLabel: {
    flex: 1,
    textAlign: "center",
  },
  legendContainer: {
    marginTop: Spacing.three,
  },
  legendGradient: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  legendSwatch: {
    flex: 1,
  },
  legendLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
