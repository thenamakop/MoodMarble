import type { TagValue } from "@/contracts/mood-submission";
import { calculateLocalMoodHistoryStreak } from "@/features/history/streak";

describe("local mood history streaks", () => {
  it("returns a single-day streak for one saved day", () => {
    expect(
      calculateLocalMoodHistoryStreak([
        createRecord({
          id: "history-1",
          submission_date: "2026-06-16",
          recorded_at: "2026-06-16T14:00:00.000Z",
        }),
      ]),
    ).toEqual({
      dayCount: 1,
      startDate: "2026-06-16",
      endDate: "2026-06-16",
    });
  });

  it("returns a multi-day streak for consecutive saved days", () => {
    expect(
      calculateLocalMoodHistoryStreak([
        createRecord({
          id: "history-1",
          submission_date: "2026-06-16",
          recorded_at: "2026-06-16T14:00:00.000Z",
        }),
        createRecord({
          id: "history-2",
          submission_date: "2026-06-15",
          recorded_at: "2026-06-15T14:00:00.000Z",
        }),
        createRecord({
          id: "history-3",
          submission_date: "2026-06-14",
          recorded_at: "2026-06-14T14:00:00.000Z",
        }),
      ]),
    ).toEqual({
      dayCount: 3,
      startDate: "2026-06-14",
      endDate: "2026-06-16",
    });
  });

  it("resets the streak when a day is skipped", () => {
    expect(
      calculateLocalMoodHistoryStreak([
        createRecord({
          id: "history-1",
          submission_date: "2026-06-16",
          recorded_at: "2026-06-16T14:00:00.000Z",
        }),
        createRecord({
          id: "history-2",
          submission_date: "2026-06-14",
          recorded_at: "2026-06-14T14:00:00.000Z",
        }),
      ]),
    ).toEqual({
      dayCount: 1,
      startDate: "2026-06-16",
      endDate: "2026-06-16",
    });
  });

  it("does not let same-day duplicates inflate the streak", () => {
    expect(
      calculateLocalMoodHistoryStreak([
        createRecord({
          id: "history-1",
          submission_date: "2026-06-16",
          recorded_at: "2026-06-16T18:00:00.000Z",
        }),
        createRecord({
          id: "history-2",
          submission_date: "2026-06-16",
          recorded_at: "2026-06-16T09:00:00.000Z",
        }),
        createRecord({
          id: "history-3",
          submission_date: "2026-06-15",
          recorded_at: "2026-06-15T13:00:00.000Z",
        }),
      ]),
    ).toEqual({
      dayCount: 2,
      startDate: "2026-06-15",
      endDate: "2026-06-16",
    });
  });
});

function createRecord(
  overrides: Partial<{
    id: string;
    mood_type:
      | "energised"
      | "happy"
      | "calm"
      | "focused"
      | "neutral"
      | "tired"
      | "stressed"
      | "sad"
      | "unheard";
    tags: TagValue[];
    hour_of_day: number;
    submission_date: string;
    recorded_at: string;
  }> = {},
) {
  return {
    id: overrides.id ?? "history-default",
    mood_type: overrides.mood_type ?? ("happy" as const),
    tags: overrides.tags ?? ([] as TagValue[]),
    hour_of_day: overrides.hour_of_day ?? 8,
    submission_date: overrides.submission_date ?? "2026-06-16",
    recorded_at: overrides.recorded_at ?? "2026-06-16T08:00:00.000Z",
  };
}
