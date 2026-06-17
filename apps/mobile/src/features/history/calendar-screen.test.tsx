import { cleanup, render, waitFor } from "@testing-library/react-native";

import { submitMoodSubmission } from "@/features/mood-submission/api";
import { LocalMoodCalendarScreen } from "@/features/history/calendar-screen";
import { loadGroupedLocalMoodHistory } from "@/features/history/storage";

jest.mock("@/features/history/storage", () => ({
  loadGroupedLocalMoodHistory: jest.fn(),
}));

jest.mock("@/features/mood-submission/api", () => ({
  submitMoodSubmission: jest.fn(),
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("LocalMoodCalendarScreen", () => {
  it("renders the current month", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([]);

    const view = await render(
      <LocalMoodCalendarScreen getCurrentDate={() => new Date(2026, 5, 16)} />,
    );

    await waitFor(() => expect(view.getByText("June 2026")).toBeTruthy());
    expect(view.getByText("Sun")).toBeTruthy();
    expect(view.getByText("Sat")).toBeTruthy();
  });

  it("shows day markers for saved local entries", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([
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
    ]);

    const view = await render(
      <LocalMoodCalendarScreen getCurrentDate={() => new Date(2026, 5, 16)} />,
    );

    await waitFor(() =>
      expect(view.getByTestId("calendar-marker-2026-06-16")).toBeTruthy(),
    );
    expect(view.getByTestId("calendar-marker-2026-06-03")).toBeTruthy();
    expect(view.getByText("2 marked days")).toBeTruthy();
    expect(submitMoodSubmission).not.toHaveBeenCalled();
  });

  it("renders the dominant mood marker chosen by the helper rule", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([
      {
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
            recorded_at: "2026-06-16T18:00:00.000Z",
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
            recorded_at: "2026-06-16T12:00:00.000Z",
          }),
        ],
      },
    ]);

    const view = await render(
      <LocalMoodCalendarScreen getCurrentDate={() => new Date(2026, 5, 16)} />,
    );

    await waitFor(() => expect(view.getByText("Calm")).toBeTruthy());
  });

  it("shows an empty month state when there are no entries", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([]);

    const view = await render(
      <LocalMoodCalendarScreen getCurrentDate={() => new Date(2026, 5, 16)} />,
    );

    await waitFor(() =>
      expect(view.getByTestId("calendar-empty-state")).toBeTruthy(),
    );
    expect(
      view.getByText(
        "No marbles saved this month yet. The calendar will light up as you log a few private check-ins.",
      ),
    ).toBeTruthy();
  });

  it("shows a sparse state when only a few days are marked", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([
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
    ]);

    const view = await render(
      <LocalMoodCalendarScreen getCurrentDate={() => new Date(2026, 5, 16)} />,
    );

    await waitFor(() =>
      expect(view.getByTestId("calendar-sparse-state")).toBeTruthy(),
    );
    expect(
      view.getByText(
        "A few days are starting to appear. Keep going to build a clearer monthly pattern.",
      ),
    ).toBeTruthy();
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
