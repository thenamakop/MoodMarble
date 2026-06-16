import { describe, expect, it } from "vitest";

import { MOODS, MoodSubmissionSchema, TAGS } from "../../../../packages/shared";

describe("MoodSubmissionSchema", () => {
  it("accepts a valid anonymous mood submission", () => {
    const result = MoodSubmissionSchema.parse({
      workspace_id: "ws_123",
      team_id: "tm_123",
      mood_type: "stressed",
      tags: ["#workload", "#deadlines"],
      note: "Sprint pressure feels high today.",
      hour_of_day: 14,
      submission_date: "2026-06-16",
    });

    expect(result).toEqual({
      workspace_id: "ws_123",
      team_id: "tm_123",
      mood_type: "stressed",
      tags: ["#workload", "#deadlines"],
      note: "Sprint pressure feels high today.",
      hour_of_day: 14,
      submission_date: "2026-06-16",
    });
  });

  it("defaults tags to an empty list", () => {
    const result = MoodSubmissionSchema.parse({
      workspace_id: "ws_123",
      team_id: "tm_123",
      mood_type: "happy",
      hour_of_day: 9,
      submission_date: "2026-06-16",
    });

    expect(result.tags).toEqual([]);
  });

  it("supports exactly the 9 predefined moods", () => {
    expect(MOODS).toHaveLength(9);

    for (const mood of MOODS) {
      expect(
        MoodSubmissionSchema.parse({
          workspace_id: "ws_123",
          team_id: "tm_123",
          mood_type: mood,
          hour_of_day: 12,
          submission_date: "2026-06-16",
        }).mood_type,
      ).toBe(mood);
    }

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "angry",
        hour_of_day: 12,
        submission_date: "2026-06-16",
      }),
    ).toThrow();
  });

  it("supports only predefined tags and up to 2 tags", () => {
    expect(TAGS).toEqual([
      "#meetings",
      "#workload",
      "#management",
      "#team",
      "#deadlines",
      "#recognition",
    ]);

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "focused",
        tags: ["#workload", "#team", "#deadlines"],
        hour_of_day: 10,
        submission_date: "2026-06-16",
      }),
    ).toThrow("Up to 2 tags are allowed per submission.");

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "focused",
        tags: ["#standup"],
        hour_of_day: 10,
        submission_date: "2026-06-16",
      }),
    ).toThrow();
  });

  it("enforces note length and trims note text", () => {
    const result = MoodSubmissionSchema.parse({
      workspace_id: "ws_123",
      team_id: "tm_123",
      mood_type: "neutral",
      note: "  Keeping it brief.  ",
      hour_of_day: 11,
      submission_date: "2026-06-16",
    });

    expect(result.note).toBe("Keeping it brief.");

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "neutral",
        note: "x".repeat(121),
        hour_of_day: 11,
        submission_date: "2026-06-16",
      }),
    ).toThrow("Note must be 120 characters or fewer.");
  });

  it("accepts hour_of_day only between 0 and 23", () => {
    expect(
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "calm",
        hour_of_day: 0,
        submission_date: "2026-06-16",
      }).hour_of_day,
    ).toBe(0);

    expect(
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "calm",
        hour_of_day: 23,
        submission_date: "2026-06-16",
      }).hour_of_day,
    ).toBe(23);

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "calm",
        hour_of_day: 24,
        submission_date: "2026-06-16",
      }),
    ).toThrow("hour_of_day must be between 0 and 23");
  });

  it("requires workspace_id and rejects privacy-breaking extra identifiers", () => {
    expect(() =>
      MoodSubmissionSchema.parse({
        team_id: "tm_123",
        mood_type: "sad",
        hour_of_day: 15,
        submission_date: "2026-06-16",
      }),
    ).toThrow();

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "sad",
        hour_of_day: 15,
        submission_date: "2026-06-16",
        user_id: "user_123",
      }),
    ).toThrow();

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "sad",
        hour_of_day: 15,
        submission_date: "2026-06-16",
        email: "person@example.com",
      }),
    ).toThrow();

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "sad",
        hour_of_day: 15,
        submission_date: "2026-06-16",
        device_token: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });

  it("requires a valid local submission_date", () => {
    expect(
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "happy",
        hour_of_day: 9,
        submission_date: "2026-06-16",
      }).submission_date,
    ).toBe("2026-06-16");

    expect(() =>
      MoodSubmissionSchema.parse({
        workspace_id: "ws_123",
        team_id: "tm_123",
        mood_type: "happy",
        hour_of_day: 9,
        submission_date: "2026-02-30",
      }),
    ).toThrow("submission_date must be a real calendar date");
  });
});
