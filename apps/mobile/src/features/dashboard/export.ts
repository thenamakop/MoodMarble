import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";

interface BuildManagerExportCsvInput {
  viewModel: ManagerDashboardViewModel;
  teamLabel: string;
  windowStartDate: string;
  windowEndDate: string;
}

/**
 * Serializes the manager dashboard's already-privacy-filtered aggregate
 * view model into a CSV. Exports only what's already visible on screen.
 * Includes a header block so the file is self-explanatory if it's
 * forwarded to someone outside the app.
 */
export function buildManagerExportCsv(input: BuildManagerExportCsvInput): string {
  const header = [
    "MoodMarble aggregate export",
    `Team: ${input.teamLabel}`,
    `Window: ${input.windowStartDate} to ${input.windowEndDate}`,
    `Generated: ${new Date().toISOString()}`,
    "Note: aggregate analytics only. Individual submissions, raw notes, and identity details are never included in this export.",
  ].join("\n");

  const sections = [
    buildHeatmapSection(input.viewModel),
    buildWeeklyTrendSection(input.viewModel),
    buildTagFrequencySection(input.viewModel),
  ];

  return [header, ...sections].join("\n\n");
}

function buildHeatmapSection(viewModel: ManagerDashboardViewModel): string {
  const rows = viewModel.dailyHeatmap.data.map(
    (cell) => `${cell.hourLabel},${formatCsvScore(cell)},${cell.visibility}`,
  );
  return ["Daily heatmap", "hour,average_mood_score,visibility", ...rows].join("\n");
}

function buildWeeklyTrendSection(viewModel: ManagerDashboardViewModel): string {
  const rows = viewModel.weeklyTrend.data.map(
    (point) => `${point.date},${formatCsvScore(point)},${point.visibility}`,
  );
  return ["Weekly trend", "date,average_mood_score,visibility", ...rows].join("\n");
}

function buildTagFrequencySection(viewModel: ManagerDashboardViewModel): string {
  const rows = viewModel.tagFrequency.data.map(
    (bar) => `${escapeCsvValue(bar.tag)},${bar.value}`,
  );
  return ["Tag frequency", "tag,count", ...rows].join("\n");
}

function formatCsvScore(point: { scoreValue: number | null; visibility: string }): string {
  if (point.visibility === "hidden" || point.scoreValue === null) {
    return "";
  }
  return String(point.scoreValue);
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildManagerExportFileName(input: {
  teamLabel: string;
  windowStartDate: string;
  windowEndDate: string;
}): string {
  const safeTeamLabel = input.teamLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `moodmarble-${safeTeamLabel}-${input.windowStartDate}-to-${input.windowEndDate}.csv`;
}
