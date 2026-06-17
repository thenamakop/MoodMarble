import {
  LocalMoodHistoryRecordInputSchema,
  LocalMoodHistoryRecordSchema,
  createLocalMoodHistoryRecord,
  extractLocalMoodHistoryRecordInput,
  getLocalMoodHistoryDayKeys,
  groupLocalMoodHistoryByDay,
  normalizeLocalMoodHistoryRecords,
} from "@/features/history/model";
import { MoodSubmissionSchema } from "@/contracts/mood-submission";

describe("local mood history model", () => {
  it("keeps only local history fields from a verified submission", () => {
    const submission = MoodSubmissionSchema.parse({
      workspace_id: "ws_localdemo",
      team_id: "tm_engineering",
      mood_type: "happy",
      tags: ["#team", "#recognition"],
      note: "A short note",
      hour_of_day: 9,
      submission_date: "2026-06-15",
    });

    expect(extractLocalMoodHistoryRecordInput(submission)).toEqual(
      LocalMoodHistoryRecordInputSchema.parse({
        mood_type: "happy",
        tags: ["#team", "#recognition"],
        hour_of_day: 9,
        submission_date: "2026-06-15",
      }),
    );
  });

  it("creates a local history record with a local id and timestamp", () => {
    const record = createLocalMoodHistoryRecord(
      {
        mood_type: "calm",
        tags: ["#workload"],
        hour_of_day: 14,
        submission_date: "2026-06-15",
      },
      {
        idGenerator: () => "history-1",
        now: () => new Date("2026-06-15T14:30:00.000Z"),
      },
    );

    expect(record).toEqual(
      LocalMoodHistoryRecordSchema.parse({
        id: "history-1",
        mood_type: "calm",
        tags: ["#workload"],
        hour_of_day: 14,
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T14:30:00.000Z",
      }),
    );
  });

  it("sorts records newest-first by local day and local timestamp", () => {
    const records = normalizeLocalMoodHistoryRecords([
      {
        id: "history-older-day",
        mood_type: "focused",
        tags: [],
        hour_of_day: 8,
        submission_date: "2026-06-14",
        recorded_at: "2026-06-14T08:00:00.000Z",
      },
      {
        id: "history-newer-time",
        mood_type: "happy",
        tags: [],
        hour_of_day: 18,
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T18:00:00.000Z",
      },
      {
        id: "history-earlier-time",
        mood_type: "calm",
        tags: [],
        hour_of_day: 9,
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T09:00:00.000Z",
      },
    ]);

    expect(records.map((record) => record.id)).toEqual([
      "history-newer-time",
      "history-earlier-time",
      "history-older-day",
    ]);
  });

  it("groups records by local submission day for timeline rendering", () => {
    const groups = groupLocalMoodHistoryByDay([
      {
        id: "history-2",
        mood_type: "stressed",
        tags: ["#deadlines"],
        hour_of_day: 16,
        submission_date: "2026-06-14",
        recorded_at: "2026-06-14T16:20:00.000Z",
      },
      {
        id: "history-3",
        mood_type: "energised",
        tags: [],
        hour_of_day: 11,
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T11:10:00.000Z",
      },
      {
        id: "history-1",
        mood_type: "happy",
        tags: ["#team"],
        hour_of_day: 9,
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T09:15:00.000Z",
      },
    ]);

    expect(groups).toEqual([
      {
        submission_date: "2026-06-15",
        records: [
          {
            id: "history-3",
            mood_type: "energised",
            tags: [],
            hour_of_day: 11,
            submission_date: "2026-06-15",
            recorded_at: "2026-06-15T11:10:00.000Z",
          },
          {
            id: "history-1",
            mood_type: "happy",
            tags: ["#team"],
            hour_of_day: 9,
            submission_date: "2026-06-15",
            recorded_at: "2026-06-15T09:15:00.000Z",
          },
        ],
      },
      {
        submission_date: "2026-06-14",
        records: [
          {
            id: "history-2",
            mood_type: "stressed",
            tags: ["#deadlines"],
            hour_of_day: 16,
            submission_date: "2026-06-14",
            recorded_at: "2026-06-14T16:20:00.000Z",
          },
        ],
      },
    ]);
  });

  it("returns unique day keys for streak and calendar calculations", () => {
    expect(
      getLocalMoodHistoryDayKeys([
        {
          id: "history-2",
          mood_type: "focused",
          tags: [],
          hour_of_day: 18,
          submission_date: "2026-06-14",
          recorded_at: "2026-06-14T18:00:00.000Z",
        },
        {
          id: "history-1",
          mood_type: "happy",
          tags: [],
          hour_of_day: 8,
          submission_date: "2026-06-15",
          recorded_at: "2026-06-15T08:00:00.000Z",
        },
        {
          id: "history-3",
          mood_type: "calm",
          tags: [],
          hour_of_day: 9,
          submission_date: "2026-06-15",
          recorded_at: "2026-06-15T09:00:00.000Z",
        },
      ]),
    ).toEqual(["2026-06-15", "2026-06-14"]);
  });
});
