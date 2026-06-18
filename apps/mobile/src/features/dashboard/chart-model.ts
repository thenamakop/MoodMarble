import {
  MOOD_COLORS,
  MOOD_LABELS,
  type DashboardAlertState,
  type DashboardCountValue,
  type DashboardMetricVisibility,
  type DashboardPrivacyState,
  type DashboardScoreValue,
  type Mood,
} from "@/contracts/dashboard";

import type { ManagerDashboardBundle } from "@/features/dashboard/api";

interface ManagerDashboardBannerModel {
  kind: "alert" | "privacy";
  title: string;
  message: string;
}

interface ManagerDashboardSummaryModel {
  totalSubmissionsLabel: string;
  windowLabel: string;
}

interface DailyHeatmapCellModel {
  hourLabel: string;
  hourOfDay: number;
  scoreValue: number;
  scoreLabel: string;
  submissionsLabel: string;
  visibility: DashboardMetricVisibility;
}

interface WeeklyTrendPointModel {
  label: string;
  date: string;
  scoreValue: number;
  scoreLabel: string;
  visibility: DashboardMetricVisibility;
}

interface SubmissionVolumeBarModel {
  label: string;
  date: string;
  totalValue: number;
  totalLabel: string;
  visibility: DashboardMetricVisibility;
}

interface MoodDistributionSegmentModel {
  moodType: Mood;
  label: string;
  value: number;
  valueLabel: string;
  color: string;
  visibility: DashboardMetricVisibility;
}

interface TagFrequencyBarModel {
  tag: string;
  value: number;
  valueLabel: string;
  visibility: DashboardMetricVisibility;
}

interface ChartSectionModel<TChartDatum> {
  visibility: DashboardMetricVisibility;
  hiddenMessage: string | null;
  thresholdMessage: string | null;
  data: TChartDatum[];
}

interface ManagerDashboardViewModel {
  summary: ManagerDashboardSummaryModel;
  banner: ManagerDashboardBannerModel | null;
  dailyHeatmap: ChartSectionModel<DailyHeatmapCellModel>;
  weeklyTrend: ChartSectionModel<WeeklyTrendPointModel>;
  submissionVolume: ChartSectionModel<SubmissionVolumeBarModel>;
  moodDistribution: ChartSectionModel<MoodDistributionSegmentModel>;
  tagFrequency: ChartSectionModel<TagFrequencyBarModel>;
}

export function buildManagerDashboardViewModel(
  bundle: ManagerDashboardBundle,
): ManagerDashboardViewModel {
  const dailyVisibility = bundle.daily.privacy.visibility;
  const weeklyVisibility = bundle.weekly.privacy.visibility;
  const tagsVisibility = bundle.tags.privacy.visibility;
  const strongestPrivacy = getStrongestVisibility([
    dailyVisibility,
    weeklyVisibility,
    tagsVisibility,
  ]);

  return {
    summary: {
      totalSubmissionsLabel: formatCountValue(
        bundle.weekly.summary.total_submissions,
      ),
      windowLabel: `${bundle.weekly.window.start_date} to ${bundle.weekly.window.end_date}`,
    },
    banner: buildDashboardBanner(
      bundle.weekly.summary.alert_state,
      strongestPrivacy,
      bundle.weekly.privacy,
    ),
    dailyHeatmap: {
      visibility: dailyVisibility,
      hiddenMessage: getHiddenMessage("daily heatmap", bundle.daily.privacy),
      thresholdMessage: getThresholdMessage(bundle.daily.privacy),
      data: bundle.daily.hourly_buckets.map((bucket) => ({
        hourLabel: formatHourLabel(bucket.hour_of_day),
        hourOfDay: bucket.hour_of_day,
        scoreValue: getChartScoreValue(bucket.average_mood_score),
        scoreLabel: formatScoreValue(bucket.average_mood_score),
        submissionsLabel: formatCountValue(bucket.total_submissions),
        visibility: bucket.privacy.visibility,
      })),
    },
    weeklyTrend: {
      visibility: weeklyVisibility,
      hiddenMessage: getHiddenMessage("weekly trend", bundle.weekly.privacy),
      thresholdMessage: getThresholdMessage(bundle.weekly.privacy),
      data: bundle.weekly.daily_points.map((point) => ({
        label: point.date.slice(5),
        date: point.date,
        scoreValue: getChartScoreValue(point.average_mood_score),
        scoreLabel: formatScoreValue(point.average_mood_score),
        visibility: point.privacy.visibility,
      })),
    },
    submissionVolume: {
      visibility: weeklyVisibility,
      hiddenMessage: getHiddenMessage(
        "submission volume",
        bundle.weekly.privacy,
      ),
      thresholdMessage: getThresholdMessage(bundle.weekly.privacy),
      data: bundle.weekly.daily_points.map((point) => ({
        label: point.date.slice(5),
        date: point.date,
        totalValue: getChartCountValue(point.total_submissions),
        totalLabel: formatCountValue(point.total_submissions),
        visibility: point.privacy.visibility,
      })),
    },
    moodDistribution: {
      visibility: weeklyVisibility,
      hiddenMessage: getHiddenMessage(
        "mood distribution",
        bundle.weekly.privacy,
      ),
      thresholdMessage: getThresholdMessage(bundle.weekly.privacy),
      data: bundle.weekly.summary.mood_distribution
        .map((entry) => ({
          moodType: entry.mood_type,
          label: MOOD_LABELS[entry.mood_type],
          value: getChartCountValue(entry.count),
          valueLabel: formatCountValue(entry.count),
          color: MOOD_COLORS[entry.mood_type],
          visibility: weeklyVisibility,
        }))
        .filter((entry) => entry.value > 0),
    },
    tagFrequency: {
      visibility: tagsVisibility,
      hiddenMessage: getHiddenMessage("tag chart", bundle.tags.privacy),
      thresholdMessage: getThresholdMessage(bundle.tags.privacy),
      data: bundle.tags.tag_counts.map((entry) => ({
        tag: entry.tag,
        value: getChartCountValue(entry.count),
        valueLabel: formatCountValue(entry.count),
        visibility: tagsVisibility,
      })),
    },
  };
}

function buildDashboardBanner(
  alertState: DashboardAlertState,
  strongestVisibility: DashboardMetricVisibility,
  strongestPrivacy: DashboardPrivacyState,
): ManagerDashboardBannerModel | null {
  if (alertState.status === "active" && alertState.message) {
    return {
      kind: "alert",
      title: "Manager alert",
      message: alertState.message,
    };
  }

  if (strongestVisibility === "hidden") {
    return {
      kind: "privacy",
      title: "Privacy threshold active",
      message:
        "Some dashboard widgets remain hidden until the minimum anonymous sample size is reached.",
    };
  }

  if (strongestVisibility === "blurred") {
    return {
      kind: "privacy",
      title: "Blurred values active",
      message: getThresholdMessage(strongestPrivacy) ?? "",
    };
  }

  return null;
}

function getStrongestVisibility(
  visibilities: DashboardMetricVisibility[],
): DashboardMetricVisibility {
  if (visibilities.includes("hidden")) {
    return "hidden";
  }

  if (visibilities.includes("blurred")) {
    return "blurred";
  }

  return "visible";
}

function getThresholdMessage(privacy: DashboardPrivacyState): string | null {
  if (privacy.visibility === "hidden") {
    return "Precise values stay hidden until the minimum anonymous submission threshold is reached.";
  }

  if (privacy.visibility === "blurred") {
    return "Precise values are blurred because this team is below the threshold for exact counts.";
  }

  return null;
}

function getHiddenMessage(
  label: string,
  privacy: DashboardPrivacyState,
): string | null {
  if (privacy.visibility !== "hidden") {
    return null;
  }

  return `The ${label} is hidden until privacy thresholds are met.`;
}

function getChartCountValue(value: DashboardCountValue): number {
  if (value.kind === "exact") {
    return value.value;
  }

  if (value.kind === "range") {
    return (value.min + value.max) / 2;
  }

  return 0;
}

function getChartScoreValue(value: DashboardScoreValue): number {
  if (value.kind === "exact") {
    return value.value;
  }

  if (value.kind === "range") {
    return (value.min + value.max) / 2;
  }

  return 0;
}

function formatCountValue(value: DashboardCountValue): string {
  if (value.kind === "exact") {
    return String(value.value);
  }

  if (value.kind === "range") {
    return `${value.min}-${value.max}`;
  }

  return "Hidden";
}

function formatScoreValue(value: DashboardScoreValue): string {
  if (value.kind === "exact") {
    return Number.isInteger(value.value)
      ? String(value.value)
      : value.value.toFixed(1);
  }

  if (value.kind === "range") {
    return `${value.min}-${value.max}`;
  }

  return "Hidden";
}

function formatHourLabel(hourOfDay: number): string {
  const suffix = hourOfDay < 12 ? "a" : "p";
  const normalizedHour = hourOfDay % 12 || 12;
  return `${normalizedHour}${suffix}`;
}

export {
  formatCountValue,
  formatScoreValue,
  getChartCountValue,
  getChartScoreValue,
  type ManagerDashboardBannerModel,
  type ManagerDashboardViewModel,
};
