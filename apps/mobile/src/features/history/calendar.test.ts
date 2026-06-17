import {
  buildLocalMoodCalendarMonth,
  getDominantMoodForDayGroup,
} from "@/features/history/calendar";

describe("local mood calendar helpers", () => {
  it("renders the current month shape deterministically", () => {
    const month = buildLocalMoodCalendarMonth([], new Date(2026, 5, 16));

    expect(month.monthLabel).toBe("June 2026");
    expect(month.weeks).toHaveLength(5);
    expect(month.weeks[0]?.[1]?.dateKey).toBe("2026-06-01");
    expect(month.weeks[4]?.[2]?.dateKey).toBe("2026-06-30");
  });

  it("adds day markers for days with local entries in the current month", () => {
    const month = buildLocalMoodCalendarMonth(
      [
        {
          submission_date: "2026-06-16",
          records: [
            createRecord({
              id: "history-1",
              mood_type: "happy",
              submission_date: "2026-06-16",
              recorded_at: "2026-06-16T14:00:00.000Z",
            }),
          ],
        },
        {
          submission_date: "2026-06-03",
          records: [
            createRecord({
              id: "history-2",
              mood_type: "calm",
              submission_date: "2026-06-03",
              recorded_at: "2026-06-03T09:00:00.000Z",
            }),
          ],
        },
      ],
      new Date(2026, 5, 16),
    );

    const markedCells = month.weeks
      .flat()
      .filter((cell) => cell.dominantMood !== null);

    expect(month.markedDayCount).toBe(2);
    expect(markedCells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dateKey: "2026-06-03",
          dominantMood: "calm",
          entryCount: 1,
        }),
        expect.objectContaining({
          dateKey: "2026-06-16",
          dominantMood: "happy",
          entryCount: 1,
        }),
      ]),
    );
  });

  it("uses highest count, then latest entry, to choose the dominant mood", () => {
    expect(
      getDominantMoodForDayGroup({
        submission_date: "2026-06-16",
        records: [
          createRecord({
            id: "history-1",
            mood_type: "happy",
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T09:00:00.000Z",
          }),
          createRecord({
            id: "history-2",
            mood_type: "calm",
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T12:00:00.000Z",
          }),
          createRecord({
            id: "history-3",
            mood_type: "happy",
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T08:00:00.000Z",
          }),
          createRecord({
            id: "history-4",
            mood_type: "calm",
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T18:00:00.000Z",
          }),
        ],
      }),
    ).toBe("calm");
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
    tags: string[];
    hour_of_day: number;
    submission_date: string;
    recorded_at: string;
  }> = {},
) {
  return {
    id: overrides.id ?? "history-default",
    mood_type: overrides.mood_type ?? "happy",
    tags: overrides.tags ?? [],
    hour_of_day: overrides.hour_of_day ?? 8,
    submission_date: overrides.submission_date ?? "2026-06-16",
    recorded_at: overrides.recorded_at ?? "2026-06-16T08:00:00.000Z",
  };
}
