import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Maximize2, X } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { DailyHeatmap } from "@/features/dashboard/daily-heatmap";
import { MoodDistributionList } from "@/features/dashboard/mood-distribution-list";
import { SubmissionVolumeChart } from "@/features/dashboard/submission-volume-chart";
import { TagFrequencyChart } from "@/features/dashboard/tag-frequency-chart";
import { ChartWidthProvider, useChartWidth } from "@/features/dashboard/use-chart-width";
import { WeeklyTrendChart } from "@/features/dashboard/weekly-trend-chart";
import { useTheme } from "@/hooks/use-theme";

interface ManagerDashboardChartsProps {
  viewModel: ManagerDashboardViewModel;
}

const CHART_FALLBACK_WIDTH = 320;

/**
 * Renders the manager dashboard chart cards for mobile.
 *
 * Charts are sized to the card width rather than a fixed desktop width, and the
 * mood distribution is shown as a ranked list to stay readable on small screens.
 */
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
        isExpandableChart={true}
        testID="manager-dashboard-weekly-card"
        thresholdMessage={viewModel.weeklyTrend.thresholdMessage}
        title="Weekly trend"
        visibility={viewModel.weeklyTrend.visibility}
      >
        <View testID="manager-dashboard-weekly-chart">
          <ResponsiveVictoryChart height={200}>
            {(width) => <WeeklyTrendChart data={viewModel.weeklyTrend.data} width={width} />}
          </ResponsiveVictoryChart>
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
        isExpandableChart={true}
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
        isExpandableChart={true}
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

/**
 * Renders a chart that sizes itself to the surrounding card width.
 */
function ResponsiveVictoryChart({
  height,
  children,
}: {
  height: number;
  children: (width: number) => React.ReactNode;
}) {
  const width = useChartWidth(CHART_FALLBACK_WIDTH);

  return <>{children(width)}</>;
}

/**
 * Renders a dashboard chart card with privacy-aware fallback content.
 */
function ChartCard({
  title,
  description,
  visibility,
  thresholdMessage,
  hiddenMessage,
  children,
  testID,
  isExpandableChart = false,
}: {
  title: string;
  description: string;
  visibility: ManagerDashboardViewModel["dailyHeatmap"]["visibility"];
  thresholdMessage: string | null;
  hiddenMessage: string | null;
  children: React.ReactNode;
  testID: string;
  isExpandableChart?: boolean;
}) {
  const theme = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandable = isExpandableChart && visibility === "visible";

  const cardContent = (
    <ThemedView style={styles.card} testID={testID} type="backgroundElement">
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          {title}
        </ThemedText>
        {isExpandable ? (
          <View style={styles.expandIcon} testID={`${testID}-expand-icon`}>
            <Maximize2 color={theme.textSecondary} size={18} />
          </View>
        ) : null}
      </View>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>

      {visibility === "hidden" ? (
        <ThemedView style={styles.fallbackPanel} testID={`${testID}-hidden`} type="background">
          <ThemedText type="smallBold">Hidden by privacy threshold</ThemedText>
          <ThemedText themeColor="textSecondary">{hiddenMessage}</ThemedText>
        </ThemedView>
      ) : (
        <ChartWidthProvider testID={`${testID}-width-provider`}>
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
        </ChartWidthProvider>
      )}
    </ThemedView>
  );

  return isExpandable ? (
    <>
      <Pressable
        onPress={() => setIsExpanded(true)}
        style={({ pressed }) => [styles.cardWrapper, { opacity: pressed ? 0.85 : 1 }]}
        testID={`${testID}-expand-trigger`}
      >
        {cardContent}
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsExpanded(false)}
        presentationStyle="pageSheet"
        visible={isExpanded}
      >
        <ThemedView style={styles.modalContainer} type="background">
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <Pressable
              onPress={() => setIsExpanded(false)}
              style={({ pressed }) => [styles.modalCloseButton, { opacity: pressed ? 0.7 : 1 }]}
              testID={`${testID}-expand-close`}
            >
              <X color={theme.text} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <ChartWidthProvider testID={`${testID}-expanded-width-provider`}>
              {children}
            </ChartWidthProvider>
          </ScrollView>
        </ThemedView>
      </Modal>
    </>
  ) : (
    <View style={styles.cardWrapper}>{cardContent}</View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  cardWrapper: {
    flexGrow: 1,
    flexBasis: 280,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  expandIcon: {
    padding: Spacing.one,
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
  modalContainer: {
    flex: 1,
    paddingTop: Spacing.six,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  modalCloseButton: {
    padding: Spacing.two,
  },
  modalScrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
});
