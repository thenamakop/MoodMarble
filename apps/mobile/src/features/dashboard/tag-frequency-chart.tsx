import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";

interface TagFrequencyChartProps {
  data: ManagerDashboardViewModel["tagFrequency"]["data"];
}

export function TagFrequencyChart({ data }: TagFrequencyChartProps) {
  const maxValue = Math.max(1, ...data.map((bar) => bar.value));

  return (
    <View testID="manager-dashboard-tags-bars">
      {data.map((bar) => (
        <View key={bar.tag} style={styles.row}>
          <ThemedText numberOfLines={1} style={styles.tagLabel} type="small">
            {bar.tag}
          </ThemedText>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(bar.value / maxValue) * 100}%` }]} />
          </View>
          <ThemedText style={styles.valueLabel} type="smallBold">
            {bar.valueLabel}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  tagLabel: {
    width: 96,
  },
  track: {
    flex: 1,
    height: 20,
    backgroundColor: "transparent",
  },
  fill: {
    height: "100%",
    backgroundColor: "#f97316",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ea580c",
    minWidth: 2,
  },
  valueLabel: {
    width: 32,
    textAlign: "right",
  },
});
