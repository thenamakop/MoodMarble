import { MOODS, TAGS, type MoodValue, type TagValue } from "@/contracts/mood-submission";
import { type LocalMoodHistoryRecord } from "@/features/history/model";
import { clearLocalMoodHistory, saveLocalMoodHistory } from "@/features/history/storage";

/**
 * Temporary debug helper: seeds the on-device mood history with a realistic
 * sample timeline so the History screens can be captured for screenshots.
 */
export async function seedSampleLocalMoodHistory(): Promise<void> {
  await clearLocalMoodHistory();

  const today = new Date();
  const records: LocalMoodHistoryRecord[] = [];

  // Distribution of entries across the last two weeks. Gaps make the
  // streak/calendar views look realistic.
  const plan: [number, number][] = [
    [0, 2],
    [-1, 1],
    [-2, 0],
    [-3, 1],
    [-4, 2],
    [-5, 1],
    [-6, 0],
    [-7, 1],
    [-8, 1],
    [-9, 2],
    [-10, 1],
    [-11, 0],
    [-12, 1],
    [-13, 1],
  ];

  for (const [dayOffset, entryCount] of plan) {
    if (entryCount === 0) {
      continue;
    }

    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const submissionDate = formatLocalDate(date);
    const hours = [9, 13, 18];

    for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
      const hour = hours[entryIndex % hours.length];
      const recordedAt = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hour, entryIndex * 7, 0),
      );

      records.push({
        id: `seed-${Math.abs(dayOffset)}-${entryIndex}-${recordedAt.getTime()}`,
        mood_type: pickMood(dayOffset, entryIndex),
        tags: pickTags(dayOffset, entryIndex),
        hour_of_day: hour,
        submission_date: submissionDate,
        recorded_at: recordedAt.toISOString(),
      });
    }
  }

  await saveLocalMoodHistory(records);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pickMood(dayOffset: number, entryIndex: number): MoodValue {
  const index = (Math.abs(dayOffset) + entryIndex) % MOODS.length;
  return MOODS[index];
}

function pickTags(dayOffset: number, entryIndex: number): TagValue[] {
  if ((dayOffset + entryIndex) % 3 === 0) {
    return [];
  }

  const tagIndex = Math.abs(dayOffset + entryIndex) % TAGS.length;
  return [TAGS[tagIndex]];
}
