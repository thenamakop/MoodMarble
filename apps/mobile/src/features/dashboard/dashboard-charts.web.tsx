import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { DailyHeatmap } from "@/features/dashboard/daily-heatmap";
import { MoodDistributionList } from "@/features/dashboard/mood-distribution-list";
import { SubmissionVolumeChart } from "@/features/dashboard/submission-volume-chart";
import { TagFrequencyChart } from "@/features/dashboard/tag-frequency-chart";
import { WeeklyTrendChart } from "@/features/dashboard/weekly-trend-chart";
import { useTheme } from "@/hooks/use-theme";

interface ManagerDashboardChartsProps {
  viewModel: ManagerDashboardViewModel;
}

export function ManagerDashboardCharts({ viewModel }: ManagerDashboardChartsProps) {
  return (
    <View style={styles.grid}>
      <ChartCard
        description="Aggregate hourly mood buckets for the selected day."
        hiddenMessage={viewModel.dailyHeatmap.hiddenMessage}
        testID="manager-dashboard-daily-card"
        thresholdMessage={viewModel.dailyHeatmap.thresholdMessage}
        title="Daily heatmap"
        visibility={viewModel.dailyHeatmap.visibility}
      >
        <View testID="manager-dashboard-daily-chart">
          <DailyHeatmap data={viewModel.dailyHeatmap.data} />
        </View>
      </ChartCard>

      <ChartCard
        description="Average mood score trend across the week."
        hiddenMessage={viewModel.weeklyTrend.hiddenMessage}
        testID="manager-dashboard-weekly-card"
        thresholdMessage={viewModel.weeklyTrend.thresholdMessage}
        title="Weekly trend"
        visibility={viewModel.weeklyTrend.visibility}
      >
        <View testID="manager-dashboard-weekly-chart">
          <WeeklyTrendChart data={viewModel.weeklyTrend.data} width={320} />
        </View>
      </ChartCard>

      <ChartCard
        description="Aggregate mood mix for the active week."
        hiddenMessage={viewModel.moodDistribution.hiddenMessage}
        testID="manager-dashboard-distribution-card"
        thresholdMessage={viewModel.moodDistribution.thresholdMessage}
        title="Mood distribution"
        visibility={viewModel.moodDistribution.visibility}
      >
        <View testID="manager-dashboard-distribution-chart">
          <MoodDistributionList data={viewModel.moodDistribution.data} />
        </View>
      </ChartCard>

      <ChartCard
        description="Anonymous submission volume by day."
        hiddenMessage={viewModel.submissionVolume.hiddenMessage}
        testID="manager-dashboard-volume-card"
        thresholdMessage={viewModel.submissionVolume.thresholdMessage}
        title="Submission volume"
        visibility={viewModel.submissionVolume.visibility}
      >
        <View testID="manager-dashboard-volume-chart">
          <SubmissionVolumeChart data={viewModel.submissionVolume.data} />
        </View>
      </ChartCard>

      <ChartCard
        description="Aggregate tag frequency for the selected week."
        hiddenMessage={viewModel.tagFrequency.hiddenMessage}
        testID="manager-dashboard-tags-card"
        thresholdMessage={viewModel.tagFrequency.thresholdMessage}
        title="Tag frequency"
        visibility={viewModel.tagFrequency.visibility}
      >
        <View testID="manager-dashboard-tags-chart">
          <TagFrequencyChart data={viewModel.tagFrequency.data} />
        </View>
      </ChartCard>
    </View>
  );
}

function ChartCard({
  title,
  description,
  visibility,
  thresholdMessage,
  hiddenMessage,
  children,
  testID,
}: {
  title: string;
  description: string;
  visibility: ManagerDashboardViewModel["dailyHeatmap"]["visibility"];
  thresholdMessage: string | null;
  hiddenMessage: string | null;
  children: React.ReactNode;
  testID: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.card} testID={testID} type="backgroundElement">
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>

      {visibility === "hidden" ? (
        <ThemedView style={styles.fallbackPanel} testID={`${testID}-hidden`} type="background">
          <ThemedText type="smallBold">Hidden by privacy threshold</ThemedText>
          <ThemedText themeColor="textSecondary">{hiddenMessage}</ThemedText>
        </ThemedView>
      ) : (
        <>
          {visibility === "blurred" && thresholdMessage ? (
            <View
              style={[
                styles.thresholdBadge,
                {
                  backgroundColor: theme.backgroundSelected,
                },
              ]}
              testID={`${testID}-blurred`}
            >
              <ThemedText type="smallBold">Blurred values</ThemedText>
              <ThemedText themeColor="textSecondary">{thresholdMessage}</ThemedText>
            </View>
          ) : null}
          {children}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  card: {
    flexGrow: 1,
    flexBasis: 280,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  fallbackPanel: {
    minHeight: 160,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    justifyContent: "center",
  },
  thresholdBadge: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.one,
  },
});
