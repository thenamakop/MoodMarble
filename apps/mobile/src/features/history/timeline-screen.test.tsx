import type { ComponentProps } from "react";
import { cleanup, render, waitFor } from "@testing-library/react-native";

import type { TagValue } from "@/contracts/mood-submission";

import { submitMoodSubmission } from "@/features/mood-submission/api";
import { LocalMoodTimelineScreen } from "@/features/history/timeline-screen";
import { loadGroupedLocalMoodHistory } from "@/features/history/storage";

jest.mock("@/features/history/storage", () => ({
  clearLocalMoodHistory: jest.fn(),
  loadGroupedLocalMoodHistory: jest.fn(),
}));

jest.mock("@/features/mood-submission/api", () => ({
  submitMoodSubmission: jest.fn(),
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  jest.mocked(loadGroupedLocalMoodHistory).mockReset();
  jest.mocked(submitMoodSubmission).mockReset();
});

describe("LocalMoodTimelineScreen", () => {
  it("shows an empty state when no local history exists", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([]);

    const view = await renderTimelineScreen();

    await waitFor(() => expect(view.getByTestId("timeline-empty-state")).toBeTruthy());
    expect(view.getByText("No mood history yet")).toBeTruthy();
    expect(
      view.getByText("Share your first marble to start a private timeline on this device."),
    ).toBeTruthy();
    expect(view.getByText("0 days")).toBeTruthy();
    expect(view.getByText("Streak ending on your next marble")).toBeTruthy();
  });

  it("renders grouped days from stored local data", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([
      {
        submission_date: "2026-06-16",
        records: [
          createRecord({
            id: "history-1",
            mood_type: "happy",
            hour_of_day: 14,
            tags: ["#team"],
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T14:00:00.000Z",
          }),
        ],
      },
      {
        submission_date: "2026-06-15",
        records: [
          createRecord({
            id: "history-2",
            mood_type: "calm",
            hour_of_day: 9,
            tags: ["#workload"],
            submission_date: "2026-06-15",
            recorded_at: "2026-06-15T09:00:00.000Z",
          }),
        ],
      },
    ]);

    const view = await renderTimelineScreen();

    await waitFor(() => expect(view.getByTestId("timeline-day-2026-06-16")).toBeTruthy());
    expect(view.getByTestId("timeline-day-2026-06-15")).toBeTruthy();
    expect(view.getByText("Happy")).toBeTruthy();
    expect(view.getByText("Calm")).toBeTruthy();
    expect(view.getByText("#team")).toBeTruthy();
    expect(view.getByText("#workload")).toBeTruthy();
    expect(view.getByText("2 days")).toBeTruthy();
    expect(view.getByText("Streak ending on 2026-06-16")).toBeTruthy();
    expect(view.getByTestId("clear-local-history-button")).toBeTruthy();
    expect(submitMoodSubmission).not.toHaveBeenCalled();
  });

  it("renders entries in newest-first chronological order within each day", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([
      {
        submission_date: "2026-06-16",
        records: [
          createRecord({
            id: "history-early",
            mood_type: "calm",
            hour_of_day: 9,
            tags: [],
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T09:00:00.000Z",
          }),
          createRecord({
            id: "history-late",
            mood_type: "focused",
            hour_of_day: 18,
            tags: [],
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T18:00:00.000Z",
          }),
        ],
      },
      {
        submission_date: "2026-06-15",
        records: [
          createRecord({
            id: "history-older",
            mood_type: "happy",
            hour_of_day: 8,
            tags: [],
            submission_date: "2026-06-15",
            recorded_at: "2026-06-15T08:00:00.000Z",
          }),
        ],
      },
    ]);

    const view = await renderTimelineScreen();

    await waitFor(() => expect(view.getByTestId("timeline-entry-history-late")).toBeTruthy());

    expect(collectTestIdsInOrder(view.toJSON())).toEqual(
      expect.arrayContaining([
        "timeline-day-2026-06-16",
        "timeline-entry-history-late",
        "timeline-entry-history-early",
        "timeline-day-2026-06-15",
        "timeline-entry-history-older",
      ]),
    );

    const orderedIds = collectTestIdsInOrder(view.toJSON());
    expect(orderedIds.indexOf("timeline-day-2026-06-16")).toBeLessThan(
      orderedIds.indexOf("timeline-day-2026-06-15"),
    );
    expect(orderedIds.indexOf("timeline-entry-history-late")).toBeLessThan(
      orderedIds.indexOf("timeline-entry-history-early"),
    );
  });

  it("shows local reflection details for each entry", async () => {
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([
      {
        submission_date: "2026-06-16",
        records: [
          createRecord({
            id: "history-1",
            mood_type: "stressed",
            hour_of_day: 16,
            tags: ["#deadlines", "#management"],
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T16:00:00.000Z",
          }),
        ],
      },
    ]);

    const view = await renderTimelineScreen({
      formatRecordedAt: (recordedAt) =>
        recordedAt === "2026-06-16T16:00:00.000Z" ? "4:37 PM" : recordedAt,
    });

    await waitFor(() => expect(view.getByText("Stressed")).toBeTruthy());
    expect(view.getByText("4:37 PM")).toBeTruthy();
    expect(view.getByText("#deadlines  #management")).toBeTruthy();
  });

  it("uses the exact local recorded timestamp for each entry", async () => {
    const formatRecordedAt = jest.fn((recordedAt: string) =>
      recordedAt === "2026-06-16T21:42:00.000Z" ? "9:42 PM" : recordedAt,
    );
    jest.mocked(loadGroupedLocalMoodHistory).mockResolvedValue([
      {
        submission_date: "2026-06-16",
        records: [
          createRecord({
            id: "history-1",
            mood_type: "focused",
            hour_of_day: 21,
            tags: ["#team"],
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T21:42:00.000Z",
          }),
        ],
      },
    ]);

    const view = await renderTimelineScreen({ formatRecordedAt });

    await waitFor(() => expect(view.getByText("9:42 PM")).toBeTruthy());
    expect(formatRecordedAt).toHaveBeenCalledWith("2026-06-16T21:42:00.000Z");
  });

  it("shows the same streak after a reload from stored local data", async () => {
    const storedTimeline = [
      {
        submission_date: "2026-06-16",
        records: [
          createRecord({
            id: "history-1",
            mood_type: "happy",
            hour_of_day: 14,
            tags: ["#team"],
            submission_date: "2026-06-16",
            recorded_at: "2026-06-16T14:00:00.000Z",
          }),
        ],
      },
      {
        submission_date: "2026-06-15",
        records: [
          createRecord({
            id: "history-2",
            mood_type: "calm",
            hour_of_day: 9,
            tags: ["#workload"],
            submission_date: "2026-06-15",
            recorded_at: "2026-06-15T09:00:00.000Z",
          }),
        ],
      },
    ];

    jest
      .mocked(loadGroupedLocalMoodHistory)
      .mockResolvedValueOnce(storedTimeline)
      .mockResolvedValueOnce(storedTimeline);

    const firstView = await renderTimelineScreen({
      formatRecordedAt: (recordedAt) =>
        recordedAt === "2026-06-16T14:00:00.000Z" ? "2:00 PM" : "9:00 AM",
    });

    await waitFor(() => expect(firstView.getByText("2 days")).toBeTruthy());
    cleanup();

    const reloadedView = await renderTimelineScreen({
      formatRecordedAt: (recordedAt) =>
        recordedAt === "2026-06-16T14:00:00.000Z" ? "2:00 PM" : "9:00 AM",
    });

    await waitFor(() => expect(reloadedView.getByText("2 days")).toBeTruthy());
    expect(reloadedView.getByText("Streak ending on 2026-06-16")).toBeTruthy();
    expect(reloadedView.getByText("2:00 PM")).toBeTruthy();
    expect(loadGroupedLocalMoodHistory).toHaveBeenCalledTimes(2);
  });
});

async function renderTimelineScreen(
  overrides?: Partial<ComponentProps<typeof LocalMoodTimelineScreen>>,
) {
  return render(
    <LocalMoodTimelineScreen formatRecordedAt={(recordedAt) => recordedAt} {...overrides} />,
  );
}

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

function collectTestIdsInOrder(node: unknown): string[] {
  if (!node) {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((entry) => collectTestIdsInOrder(entry));
  }

  if (typeof node !== "object") {
    return [];
  }

  const currentNode = node as {
    props?: { testID?: string };
    children?: unknown[];
  };
  const currentTestId = currentNode.props?.testID ? [currentNode.props.testID] : [];

  return [...currentTestId, ...collectTestIdsInOrder(currentNode.children ?? [])];
}
