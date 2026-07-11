import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { useTheme } from "@/hooks/use-theme";

interface MoodDistributionListProps {
  data: ManagerDashboardViewModel["moodDistribution"]["data"];
}

/**
 * Renders the mood distribution as a ranked list for small screens.
 *
 * The grey track behind each bar spans the full width of the chart card so it
 * aligns with the background grey box of the other dashboard charts.
 */
export function MoodDistributionList({ data }: MoodDistributionListProps) {
  const theme = useTheme();
  const total = data.reduce((sum, segment) => sum + segment.value, 0);
  const sortedData = [...data].sort((left, right) => right.value - left.value);

  return (
    <View style={styles.distributionList}>
      {sortedData.map((segment) => {
        const percentage = total > 0 ? Math.round((segment.value / total) * 100) : 0;

        return (
          <View key={segment.moodType} style={styles.distributionItem}>
            <View style={styles.distributionHeader}>
              <View style={styles.distributionLabel}>
                <View style={[styles.distributionDot, { backgroundColor: segment.color }]} />
                <ThemedText numberOfLines={1} type="smallBold">
                  {segment.label}
                </ThemedText>
              </View>
              <View style={styles.distributionValue}>
                <ThemedText type="smallBold">{segment.valueLabel}</ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  testID={`manager-dashboard-distribution-${segment.moodType}-percentage`}
                >
                  {`${percentage}%`}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.distributionBarTrack,
                {
                  backgroundColor: theme.backgroundSelected,
                  marginHorizontal: -Spacing.four,
                },
              ]}
            >
              <View
                style={[
                  styles.distributionBarFill,
                  {
                    backgroundColor: segment.color,
                    width: `${percentage}%`,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
      {total === 0 ? (
        <ThemedText themeColor="textSecondary">No mood data for this period.</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  distributionList: {
    gap: Spacing.three,
  },
  distributionItem: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  distributionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distributionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  distributionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distributionValue: {
    alignItems: "flex-end",
  },
  distributionBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  distributionBarFill: {
    height: "100%",
    borderRadius: 4,
  },
});
