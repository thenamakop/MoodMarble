import type { LocalMoodHistoryRecord } from "@/features/history/model";
import { getLocalMoodHistoryDayKeys } from "@/features/history/model";

export interface LocalMoodHistoryStreak {
  dayCount: number;
  startDate: string | null;
  endDate: string | null;
}

export function calculateLocalMoodHistoryStreak(
  records: LocalMoodHistoryRecord[],
): LocalMoodHistoryStreak {
  return calculateLocalMoodHistoryStreakFromDayKeys(
    getLocalMoodHistoryDayKeys(records),
  );
}

export function calculateLocalMoodHistoryStreakFromDayKeys(
  dayKeys: string[],
): LocalMoodHistoryStreak {
  const uniqueSortedDayKeys = Array.from(new Set(dayKeys)).sort((left, right) =>
    right.localeCompare(left),
  );

  if (uniqueSortedDayKeys.length === 0) {
    return {
      dayCount: 0,
      startDate: null,
      endDate: null,
    };
  }

  const endDate = uniqueSortedDayKeys[0];
  let dayCount = 1;
  let previousDayKey = endDate;

  for (const dayKey of uniqueSortedDayKeys.slice(1)) {
    if (dayKey !== getPreviousDayKey(previousDayKey)) {
      break;
    }

    dayCount += 1;
    previousDayKey = dayKey;
  }

  return {
    dayCount,
    startDate: uniqueSortedDayKeys[dayCount - 1] ?? endDate,
    endDate,
  };
}

function getPreviousDayKey(dayKey: string): string {
  const parsedDate = new Date(`${dayKey}T00:00:00.000Z`);
  parsedDate.setUTCDate(parsedDate.getUTCDate() - 1);

  return parsedDate.toISOString().slice(0, 10);
}
