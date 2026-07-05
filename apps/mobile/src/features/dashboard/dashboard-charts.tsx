import { StyleSheet, View } from "react-native";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLabel,
  VictoryLine,
  VictoryScatter,
  VictoryTheme,
} from "victory-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type { DashboardMetricVisibility } from "@/contracts/dashboard";
import { Spacing } from "@/constants/theme";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { ChartWidthProvider, useChartWidth } from "@/features/dashboard/use-chart-width";
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
  const chartTheme = VictoryTheme?.clean;

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
          <ResponsiveVictoryChart height={200}>
            {(width) => (
              <VictoryChart
                domainPadding={12}
                height={200}
                padding={{ bottom: 44, left: 32, right: 16, top: 16 }}
                theme={chartTheme}
                width={width}
              >
                <VictoryAxis
                  fixLabelOverlap
                  style={{
                    axis: { stroke: "transparent" },
                    tickLabels: {
                      fill: axisColor,
                      fontSize: 10,
                    },
                    ticks: { stroke: "transparent" },
                  }}
                  tickValues={viewModel.dailyHeatmap.data.map((cell) => cell.hourLabel)}
                />
                <View testID="manager-dashboard-daily-series">
                  <VictoryScatter
                    data={viewModel.dailyHeatmap.data.map((cell) => ({
                      x: cell.hourLabel,
                      y: 1,
                      size: 14,
                      fill: getHeatmapFill(cell.scoreValue, cell.visibility),
                    }))}
                    labels={() => null}
                    style={{
                      data: {
                        fill: ({ datum }) => datum.fill,
                        stroke: ({ datum }) => datum.fill,
                      },
                    }}
                    symbol="square"
                  />
                </View>
              </VictoryChart>
            )}
          </ResponsiveVictoryChart>
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
          <ResponsiveVictoryChart height={200}>
            {(width) => (
              <VictoryChart
                domain={{ y: [0, 10] }}
                domainPadding={{ x: 12, y: 12 }}
                height={200}
                padding={{ bottom: 44, left: 36, right: 28, top: 16 }}
                theme={chartTheme}
                width={width}
              >
                <VictoryAxis
                  style={axisStyle}
                  tickValues={viewModel.weeklyTrend.data.map((point) => point.label)}
                />
                <VictoryAxis dependentAxis style={axisStyle} tickValues={[0, 2, 4, 6, 8, 10]} />
                <View testID="manager-dashboard-weekly-series">
                  <VictoryLine
                    data={viewModel.weeklyTrend.data.map((point, index) => ({
                      x: point.label,
                      y: point.scoreValue,
                      // Only the last point carries a label — showing a label on
                      // every point caused overlapping numbers to spill past the
                      // chart's right edge when points were close together.
                      label:
                        index === viewModel.weeklyTrend.data.length - 1 ? point.scoreLabel : "",
                    }))}
                    interpolation="monotoneX"
                    labelComponent={
                      <VictoryLabel
                        dx={-6}
                        dy={-10}
                        style={{ fill: axisColor, fontSize: 11, fontWeight: "600" }}
                      />
                    }
                    style={{
                      data: {
                        stroke: "#4f46e5",
                        strokeWidth: 3,
                      },
                    }}
                  />
                </View>
              </VictoryChart>
            )}
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
          <MobileMoodDistribution data={viewModel.moodDistribution.data} />
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
          <ResponsiveVictoryChart height={200}>
            {(width) => (
              <VictoryChart
                domainPadding={{ x: 14, y: 12 }}
                height={200}
                padding={{ bottom: 44, left: 36, right: 16, top: 16 }}
                theme={chartTheme}
                width={width}
              >
                <VictoryAxis
                  style={axisStyle}
                  tickValues={viewModel.submissionVolume.data.map((bar) => bar.label)}
                />
                <VictoryAxis dependentAxis style={axisStyle} />
                <View testID="manager-dashboard-volume-series">
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
                  />
                </View>
              </VictoryChart>
            )}
          </ResponsiveVictoryChart>
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
          <ResponsiveVictoryChart height={200}>
            {(width) => {
              const longestTagLength = viewModel.tagFrequency.data.reduce(
                (max, bar) => Math.max(max, bar.tag.length),
                0,
              );
              // Roughly 6.5px per character at fontSize 10, clamped between a
              // sensible minimum (readable short tags) and 45% of the available
              // chart width (never let the label column crowd out the bars).
              const tagAxisPadding = Math.min(
                Math.round(width * 0.45),
                Math.max(64, Math.round(longestTagLength * 6.5) + 12),
              );

              return (
                <VictoryChart
                  domainPadding={{ x: 14, y: 8 }}
                  height={200}
                  horizontal
                  padding={{ bottom: 28, left: tagAxisPadding, right: 16, top: 16 }}
                  theme={chartTheme}
                  width={width}
                >
                  <VictoryAxis style={axisStyle} />
                  <VictoryAxis
                    dependentAxis
                    style={axisStyle}
                    tickFormat={(tick: string) =>
                      tick.length > 14 ? `${tick.slice(0, 13)}…` : tick
                    }
                    tickValues={viewModel.tagFrequency.data.map((bar) => bar.tag)}
                  />
                  <View testID="manager-dashboard-tags-series">
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
                    />
                  </View>
                </VictoryChart>
              );
            }}
          </ResponsiveVictoryChart>
        </View>
      </ChartCard>
    </View>
  );
}

/**
 * Renders a VictoryChart that sizes itself to the surrounding card width.
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
 * Renders the mood distribution as a ranked list for small screens.
 *
 * Each row shows the mood name, count, percentage, and a colored bar so the
 * full mix is readable at a glance without tiny floating pie labels.
 */
function MobileMoodDistribution({
  data,
}: {
  data: ManagerDashboardViewModel["moodDistribution"]["data"];
}) {
  const theme = useTheme();
  const total = data.reduce((sum, segment) => sum + segment.value, 0);
  const sortedData = [...data].sort((left, right) => right.value - left.value);

  return (
    <View style={styles.distributionList}>
      {sortedData.map((segment) => {
        const percentage = total > 0 ? Math.round((segment.value / total) * 100) : 0;

        return (
          <View key={segment.moodType} style={styles.distributionRow}>
            <View style={styles.distributionLabel}>
              <View style={[styles.distributionDot, { backgroundColor: segment.color }]} />
              <ThemedText type="smallBold">{segment.label}</ThemedText>
            </View>
            <View
              style={[styles.distributionBarTrack, { backgroundColor: theme.backgroundSelected }]}
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
        );
      })}
      {total === 0 ? (
        <ThemedText themeColor="textSecondary">No mood data for this period.</ThemedText>
      ) : null}
    </View>
  );
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
}

function getHeatmapFill(scoreValue: number, visibility: DashboardMetricVisibility): string {
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

const axisColor = "#6b7280";
const gridColor = "#e5e7eb";

const axisStyle = {
  axis: { stroke: "transparent" },
  tickLabels: {
    fill: axisColor,
    fontSize: 10,
  },
  grid: {
    stroke: gridColor,
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
    overflow: "hidden",
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
  distributionList: {
    gap: Spacing.three,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  distributionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    width: 88,
  },
  distributionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distributionBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  distributionBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  distributionValue: {
    width: 48,
    alignItems: "flex-end",
  },
});
