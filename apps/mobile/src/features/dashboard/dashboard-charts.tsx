import { StyleSheet, View } from "react-native";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLine,
  VictoryPie,
  VictoryScatter,
  VictoryTheme,
} from "victory-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { useTheme } from "@/hooks/use-theme";

interface ManagerDashboardChartsProps {
  viewModel: ManagerDashboardViewModel;
}

export function ManagerDashboardCharts({
  viewModel,
}: ManagerDashboardChartsProps) {
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
        <VictoryChart
          domainPadding={12}
          height={220}
          padding={{ bottom: 48, left: 36, right: 24, top: 24 }}
          testID="manager-dashboard-daily-chart"
          theme={VictoryTheme.clean}
          width={320}
        >
          <VictoryAxis
            fixLabelOverlap
            style={{
              axis: { stroke: "transparent" },
              tickLabels: {
                fill: "#6b7280",
                fontSize: 10,
              },
              ticks: { stroke: "transparent" },
            }}
            tickValues={viewModel.dailyHeatmap.data.map(
              (cell) => cell.hourLabel,
            )}
          />
          <VictoryScatter
            data={viewModel.dailyHeatmap.data.map((cell) => ({
              x: cell.hourLabel,
              y: 1,
              size: 16,
              fill: getHeatmapFill(cell.scoreValue, cell.visibility),
              label: `${cell.hourLabel}: ${cell.submissionsLabel} submissions, score ${cell.scoreLabel}`,
            }))}
            style={{
              data: {
                fill: ({ datum }) => datum.fill,
                stroke: ({ datum }) => datum.fill,
              },
            }}
            symbol="square"
            testID="manager-dashboard-daily-series"
          />
        </VictoryChart>
      </ChartCard>

      <ChartCard
        description="Average mood score trend across the week."
        hiddenMessage={viewModel.weeklyTrend.hiddenMessage}
        testID="manager-dashboard-weekly-card"
        thresholdMessage={viewModel.weeklyTrend.thresholdMessage}
        title="Weekly trend"
        visibility={viewModel.weeklyTrend.visibility}
      >
        <VictoryChart
          domainPadding={{ x: 16, y: 12 }}
          height={220}
          padding={{ bottom: 48, left: 40, right: 24, top: 24 }}
          testID="manager-dashboard-weekly-chart"
          theme={VictoryTheme.clean}
          width={320}
        >
          <VictoryAxis
            style={axisStyle}
            tickValues={viewModel.weeklyTrend.data.map((point) => point.label)}
          />
          <VictoryAxis
            dependentAxis
            style={axisStyle}
            tickValues={[0, 2, 4, 6, 8, 10]}
          />
          <VictoryLine
            data={viewModel.weeklyTrend.data.map((point) => ({
              x: point.label,
              y: point.scoreValue,
              label: point.scoreLabel,
            }))}
            interpolation="monotoneX"
            style={{
              data: {
                stroke: "#4f46e5",
                strokeWidth: 3,
              },
            }}
            testID="manager-dashboard-weekly-series"
          />
        </VictoryChart>
      </ChartCard>

      <ChartCard
        description="Aggregate mood mix for the active week."
        hiddenMessage={viewModel.moodDistribution.hiddenMessage}
        testID="manager-dashboard-distribution-card"
        thresholdMessage={viewModel.moodDistribution.thresholdMessage}
        title="Mood distribution"
        visibility={viewModel.moodDistribution.visibility}
      >
        <VictoryPie
          colorScale={viewModel.moodDistribution.data.map(
            (segment) => segment.color,
          )}
          data={viewModel.moodDistribution.data.map((segment) => ({
            x: segment.label,
            y: segment.value,
          }))}
          height={240}
          innerRadius={60}
          labelRadius={90}
          labels={({ datum }) => `${datum.x}`}
          padAngle={2}
          style={{
            labels: {
              fill: "#6b7280",
              fontSize: 11,
            },
          }}
          testID="manager-dashboard-distribution-chart"
          theme={VictoryTheme.clean}
          width={320}
        />
      </ChartCard>

      <ChartCard
        description="Anonymous submission volume by day."
        hiddenMessage={viewModel.submissionVolume.hiddenMessage}
        testID="manager-dashboard-volume-card"
        thresholdMessage={viewModel.submissionVolume.thresholdMessage}
        title="Submission volume"
        visibility={viewModel.submissionVolume.visibility}
      >
        <VictoryChart
          domainPadding={{ x: 18, y: 12 }}
          height={220}
          padding={{ bottom: 48, left: 40, right: 24, top: 24 }}
          testID="manager-dashboard-volume-chart"
          theme={VictoryTheme.clean}
          width={320}
        >
          <VictoryAxis
            style={axisStyle}
            tickValues={viewModel.submissionVolume.data.map((bar) => bar.label)}
          />
          <VictoryAxis dependentAxis style={axisStyle} />
          <VictoryBar
            data={viewModel.submissionVolume.data.map((bar) => ({
              x: bar.label,
              y: bar.totalValue,
              label: bar.totalLabel,
            }))}
            style={{
              data: {
                fill: "#14b8a6",
              },
            }}
            testID="manager-dashboard-volume-series"
          />
        </VictoryChart>
      </ChartCard>

      <ChartCard
        description="Aggregate tag frequency for the selected week."
        hiddenMessage={viewModel.tagFrequency.hiddenMessage}
        testID="manager-dashboard-tags-card"
        thresholdMessage={viewModel.tagFrequency.thresholdMessage}
        title="Tag frequency"
        visibility={viewModel.tagFrequency.visibility}
      >
        <VictoryChart
          domainPadding={{ x: 18, y: 12 }}
          height={240}
          horizontal
          padding={{ bottom: 36, left: 96, right: 24, top: 24 }}
          testID="manager-dashboard-tags-chart"
          theme={VictoryTheme.clean}
          width={320}
        >
          <VictoryAxis style={axisStyle} />
          <VictoryAxis
            dependentAxis
            style={axisStyle}
            tickValues={viewModel.tagFrequency.data.map((bar) => bar.tag)}
          />
          <VictoryBar
            data={viewModel.tagFrequency.data.map((bar) => ({
              x: bar.tag,
              y: bar.value,
              label: bar.valueLabel,
            }))}
            style={{
              data: {
                fill: "#f97316",
              },
            }}
            testID="manager-dashboard-tags-series"
          />
        </VictoryChart>
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
        <ThemedView
          style={styles.fallbackPanel}
          testID={`${testID}-hidden`}
          type="background"
        >
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
              <ThemedText themeColor="textSecondary">
                {thresholdMessage}
              </ThemedText>
            </View>
          ) : null}
          {children}
        </>
      )}
    </ThemedView>
  );
}

function getHeatmapFill(
  scoreValue: number,
  visibility: DashboardMetricVisibility,
): string {
  if (visibility === "hidden") {
    return "#9ca3af";
  }

  if (scoreValue >= 8) {
    return "#22c55e";
  }

  if (scoreValue >= 6) {
    return "#84cc16";
  }

  if (scoreValue >= 4) {
    return "#facc15";
  }

  if (scoreValue >= 2) {
    return "#fb923c";
  }

  return "#ef4444";
}

const axisStyle = {
  axis: { stroke: "transparent" },
  tickLabels: {
    fill: "#6b7280",
    fontSize: 10,
  },
  grid: {
    stroke: "#e5e7eb",
    opacity: 0.6,
  },
};

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
