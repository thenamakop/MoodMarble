import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";

interface SubmissionVolumeChartProps {
  data: ManagerDashboardViewModel["submissionVolume"]["data"];
}

const CHART_HEIGHT = 160;

export function SubmissionVolumeChart({ data }: SubmissionVolumeChartProps) {
  const maxValue = Math.max(1, ...data.map((bar) => bar.totalValue)) * 1.15;

  return (
    <View style={styles.container} testID="manager-dashboard-volume-bars">
      {data.map((bar) => (
        <View key={bar.date} style={styles.column}>
          <ThemedText style={styles.valueLabel} type="small">
            {bar.totalValue > 0 ? bar.totalLabel : ""}
          </ThemedText>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { height: `${Math.min(100, (bar.totalValue / maxValue) * 100)}%` },
              ]}
            />
          </View>
          <ThemedText themeColor="textSecondary" style={styles.dayLabel} type="small">
            {bar.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT,
    gap: Spacing.one,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  valueLabel: {
    marginBottom: 4,
  },
  track: {
    width: "60%",
    flex: 1,
    justifyContent: "flex-end",
  },
  fill: {
    width: "100%",
    backgroundColor: "#14b8a6",
    borderRadius: 4,
    minHeight: 2,
  },
  dayLabel: {
    marginTop: 4,
  },
});
