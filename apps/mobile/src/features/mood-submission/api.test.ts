import { submitMoodSubmission } from "@/features/mood-submission/api";
import { createApiUrl } from "@/lib/api";

describe("submitMoodSubmission", () => {
  const originalFetch = globalThis.fetch;
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    globalThis.fetch = jest.fn() as typeof fetch;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalApiBaseUrl) {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    }
  });

  it("uses the configured API base URL", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.moodmarble.test";
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    await submitMoodSubmission(
      {
        workspace_id: "ws_test",
        team_id: "tm_test",
        mood_type: "happy",
        tags: ["#team"],
        hour_of_day: 14,
        submission_date: "2026-06-16",
      },
      "device-jwt-token",
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.moodmarble.test/mood",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer device-jwt-token",
        },
      }),
    );
  });

  it("falls back to the local backend URL", () => {
    expect(createApiUrl("/mood")).toBe("http://127.0.0.1:3000/mood");
  });

  it("throws a stable error for failed requests", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(
      submitMoodSubmission(
        {
          workspace_id: "ws_test",
          team_id: "tm_test",
          mood_type: "focused",
          tags: [],
          hour_of_day: 9,
          submission_date: "2026-06-16",
        },
        "device-jwt-token",
      ),
    ).rejects.toThrow("Unable to submit mood right now.");
  });

  it("surfaces the backend rate-limit message when provided", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: "Daily mood submission limit reached." }),
    });

    await expect(
      submitMoodSubmission(
        {
          workspace_id: "ws_test",
          team_id: "tm_test",
          mood_type: "focused",
          tags: [],
          hour_of_day: 9,
          submission_date: "2026-06-16",
        },
        "device-jwt-token",
      ),
    ).rejects.toThrow("Daily mood submission limit reached.");
  });

  it("falls back to the stable message for unsafe backend submission errors", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        message: "Submission rejected for device 550e8400-e29b-41d4-a716-446655440000.",
      }),
    });

    await expect(
      submitMoodSubmission(
        {
          workspace_id: "ws_test",
          team_id: "tm_test",
          mood_type: "focused",
          tags: [],
          hour_of_day: 9,
          submission_date: "2026-06-16",
        },
        "device-jwt-token",
      ),
    ).rejects.toThrow("Unable to submit mood right now.");
  });

  it("fails fast when the anonymous session jwt is missing", async () => {
    await expect(
      submitMoodSubmission(
        {
          workspace_id: "ws_test",
          team_id: "tm_test",
          mood_type: "focused",
          tags: [],
          hour_of_day: 9,
          submission_date: "2026-06-16",
        },
        "",
      ),
    ).rejects.toThrow("Anonymous session missing. Join your workspace again.");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
