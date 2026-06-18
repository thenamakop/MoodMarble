import type { MoodValue } from "@/contracts/mood-submission";
import type { LocalMoodHistoryDayGroup } from "@/features/history/model";
import { normalizeLocalMoodHistoryRecords } from "@/features/history/model";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export interface LocalMoodCalendarCell {
  dateKey: string | null;
  dayOfMonth: number | null;
  dominantMood: MoodValue | null;
  entryCount: number;
  isCurrentMonth: boolean;
}

export interface LocalMoodCalendarMonth {
  monthLabel: string;
  monthKey: string;
  weeks: LocalMoodCalendarCell[][];
  markedDayCount: number;
}

export function getCalendarMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function shiftCalendarMonth(date: Date, monthOffset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
}

export function buildLocalMoodCalendarMonth(
  dayGroups: LocalMoodHistoryDayGroup[],
  currentDate: Date,
): LocalMoodCalendarMonth {
  const monthDate = getCalendarMonthStart(currentDate);
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyCells = firstDayOfMonth.getDay();

  const markersByDate = new Map<
    string,
    { dominantMood: MoodValue; entryCount: number }
  >();

  for (const group of dayGroups) {
    if (!group.submission_date.startsWith(`${monthKey}-`)) {
      continue;
    }

    markersByDate.set(group.submission_date, {
      dominantMood: getDominantMoodForDayGroup(group),
      entryCount: group.records.length,
    });
  }

  const cells: LocalMoodCalendarCell[] = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push({
      dateKey: null,
      dayOfMonth: null,
      dominantMood: null,
      entryCount: 0,
      isCurrentMonth: false,
    });
  }

  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
    const dateKey = `${monthKey}-${String(dayOfMonth).padStart(2, "0")}`;
    const marker = markersByDate.get(dateKey);

    cells.push({
      dateKey,
      dayOfMonth,
      dominantMood: marker?.dominantMood ?? null,
      entryCount: marker?.entryCount ?? 0,
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      dateKey: null,
      dayOfMonth: null,
      dominantMood: null,
      entryCount: 0,
      isCurrentMonth: false,
    });
  }

  return {
    monthLabel: `${MONTH_NAMES[monthIndex]} ${year}`,
    monthKey,
    weeks: chunkIntoWeeks(cells),
    markedDayCount: markersByDate.size,
  };
}

export function getDominantMoodForDayGroup(
  dayGroup: LocalMoodHistoryDayGroup,
): MoodValue {
  const normalizedRecords = normalizeLocalMoodHistoryRecords(dayGroup.records);
  const counts = new Map<MoodValue, number>();

  for (const record of normalizedRecords) {
    counts.set(record.mood_type, (counts.get(record.mood_type) ?? 0) + 1);
  }

  const highestCount = Math.max(...counts.values());
  const leadingMoods = new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count === highestCount)
      .map(([mood]) => mood),
  );

  return (
    normalizedRecords.find((record) => leadingMoods.has(record.mood_type))
      ?.mood_type ?? normalizedRecords[0].mood_type
  );
}

function chunkIntoWeeks(
  cells: LocalMoodCalendarCell[],
): LocalMoodCalendarCell[][] {
  const weeks: LocalMoodCalendarCell[][] = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}
