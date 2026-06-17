import type { ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

import {
  createLocalMoodHistoryRecord,
  extractLocalMoodHistoryRecordInput,
} from "@/features/history/model";
import { appendLocalMoodHistoryRecord } from "@/features/history/storage";
import { MarbleTrayScreen } from "@/features/mood-submission/marble-tray-screen";
import { CONFIRMATION_AUTO_DISMISS_MS } from "@/features/mood-submission/submission-confirmation";

jest.mock("@/features/history/model", () => ({
  createLocalMoodHistoryRecord: jest.fn(),
  extractLocalMoodHistoryRecordInput: jest.fn(),
}));

jest.mock("@/features/history/storage", () => ({
  appendLocalMoodHistoryRecord: jest.fn(),
}));

const { useRouter } = jest.requireMock("expo-router") as {
  useRouter: jest.Mock;
};

afterEach(() => {
  jest.useRealTimers();
  cleanup();
  jest.clearAllMocks();
});

describe("MarbleTrayScreen", () => {
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: jest.fn(),
    });
  });

  it("allows selecting a marble mood", async () => {
    const { findByTestId, getByText } = await renderScreen();

    fireEvent.press(await findByTestId("mood-happy"));

    await waitFor(() => expect(getByText("Selected: Happy")).toBeTruthy());
  });

  it("enforces the 2-tag limit", async () => {
    const { findByTestId, getByText } = await renderScreen();

    fireEvent.press(await findByTestId("tag-#meetings"));
    fireEvent.press(await findByTestId("tag-#workload"));
    fireEvent.press(await findByTestId("tag-#management"));

    await waitFor(() => expect(getByText("Choose up to 2 tags.")).toBeTruthy());
  });

  it("limits the note to 120 characters", async () => {
    const { findByDisplayValue, findByTestId } = await renderScreen();
    const noteInput = await findByTestId("note-input");

    fireEvent.changeText(noteInput, "x".repeat(140));

    expect(
      (await findByDisplayValue("x".repeat(120))).props.value,
    ).toHaveLength(120);
  });

  it("submits the shared payload shape", async () => {
    const onSubmitMood = jest.fn().mockResolvedValue(undefined);
    const { findByTestId } = await renderScreen({ onSubmitMood });

    fireEvent.press(await findByTestId("mood-calm"));
    fireEvent.press(await findByTestId("tag-#team"));
    fireEvent.changeText(
      await findByTestId("note-input"),
      " Keeping steady today. ",
    );
    fireEvent.press(await findByTestId("submit-button"));

    await waitFor(() => expect(onSubmitMood).toHaveBeenCalledTimes(1));

    expect(onSubmitMood).toHaveBeenCalledWith(
      {
        workspace_id: "ws_test",
        team_id: "tm_test",
        mood_type: "calm",
        tags: ["#team"],
        note: "Keeping steady today.",
        hour_of_day: 14,
        submission_date: "2026-06-16",
      },
      "device-jwt-token",
    );
  });

  it("keeps submit disabled and explains the missing submission context", async () => {
    const onSubmitMood = jest.fn().mockResolvedValue(undefined);
    const { findByTestId, findByText } = await renderScreen({
      deviceJwt: undefined,
      onSubmitMood,
    });

    fireEvent.press(await findByTestId("mood-calm"));
    fireEvent.press(await findByTestId("submit-button"));

    expect(onSubmitMood).not.toHaveBeenCalled();
    expect(
      await findByText(
        "Submission needs workspace access before a marble can be shared.",
      ),
    ).toBeTruthy();
  });

  it("shows the confirmation after a successful submit", async () => {
    const onSubmitMood = jest.fn().mockResolvedValue(undefined);
    const { findByTestId, getByText } = await renderScreen({ onSubmitMood });

    fireEvent.press(await findByTestId("mood-happy"));
    fireEvent.press(await findByTestId("submit-button"));

    await findByTestId("submission-confirmation");
    expect(getByText("Marble shared anonymously.")).toBeTruthy();
  });

  it("creates a local history record after a successful submit", async () => {
    const onSubmitMood = jest.fn().mockResolvedValue(undefined);
    const extractedHistoryInput = {
      mood_type: "happy",
      tags: ["#team"],
      hour_of_day: 14,
      submission_date: "2026-06-16",
    };
    const createdHistoryRecord = {
      id: "history-1",
      mood_type: "happy",
      tags: ["#team"],
      hour_of_day: 14,
      submission_date: "2026-06-16",
      recorded_at: "2026-06-16T14:00:00.000Z",
    };

    jest
      .mocked(extractLocalMoodHistoryRecordInput)
      .mockReturnValue(extractedHistoryInput);
    jest
      .mocked(createLocalMoodHistoryRecord)
      .mockReturnValue(createdHistoryRecord);
    jest.mocked(appendLocalMoodHistoryRecord).mockResolvedValue([]);

    const { findByTestId } = await renderScreen({ onSubmitMood });

    fireEvent.press(await findByTestId("mood-happy"));
    fireEvent.press(await findByTestId("tag-#team"));
    fireEvent.press(await findByTestId("submit-button"));

    await waitFor(() => expect(onSubmitMood).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(extractLocalMoodHistoryRecordInput).toHaveBeenCalledWith({
        workspace_id: "ws_test",
        team_id: "tm_test",
        mood_type: "happy",
        tags: ["#team"],
        note: undefined,
        hour_of_day: 14,
        submission_date: "2026-06-16",
      }),
    );
    expect(createLocalMoodHistoryRecord).toHaveBeenCalledWith(
      extractedHistoryInput,
    );
    expect(appendLocalMoodHistoryRecord).toHaveBeenCalledWith(
      createdHistoryRecord,
    );
  });

  it("auto-dismisses the confirmation after a short delay", async () => {
    const onSubmitMood = jest.fn().mockResolvedValue(undefined);
    const { findByTestId, queryByTestId } = await renderScreen({
      onSubmitMood,
    });

    fireEvent.press(await findByTestId("mood-calm"));
    fireEvent.press(await findByTestId("submit-button"));

    await findByTestId("submission-confirmation");

    await waitFor(
      () => expect(queryByTestId("submission-confirmation")).toBeNull(),
      { timeout: CONFIRMATION_AUTO_DISMISS_MS + 1000 },
    );
  });

  it("dismisses the confirmation when tapped", async () => {
    const onSubmitMood = jest.fn().mockResolvedValue(undefined);
    const { findByTestId, queryByTestId } = await renderScreen({
      onSubmitMood,
    });

    fireEvent.press(await findByTestId("mood-energised"));
    fireEvent.press(await findByTestId("submit-button"));

    fireEvent.press(await findByTestId("submission-confirmation"));

    await waitFor(() =>
      expect(queryByTestId("submission-confirmation")).toBeNull(),
    );
  });

  it("shows loading and error states while submitting", async () => {
    let rejectSubmission: (() => void) | undefined;
    const onSubmitMood = jest.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectSubmission = () => reject(new Error("network"));
        }),
    );
    const { findByTestId, getByText, queryByTestId } = await renderScreen({
      onSubmitMood,
    });

    fireEvent.press(await findByTestId("mood-focused"));
    fireEvent.press(await findByTestId("submit-button"));

    await waitFor(() => expect(getByText("Sharing...")).toBeTruthy());
    expect(queryByTestId("submission-confirmation")).toBeNull();

    rejectSubmission?.();

    await waitFor(() =>
      expect(getByText("Unable to submit mood right now.")).toBeTruthy(),
    );
    expect(queryByTestId("submission-confirmation")).toBeNull();
  });

  it("does not create local history when submission fails", async () => {
    const onSubmitMood = jest.fn().mockRejectedValue(new Error("network"));
    const { findByTestId, getByText } = await renderScreen({ onSubmitMood });

    fireEvent.press(await findByTestId("mood-focused"));
    fireEvent.press(await findByTestId("submit-button"));

    await waitFor(() =>
      expect(getByText("Unable to submit mood right now.")).toBeTruthy(),
    );

    expect(extractLocalMoodHistoryRecordInput).not.toHaveBeenCalled();
    expect(createLocalMoodHistoryRecord).not.toHaveBeenCalled();
    expect(appendLocalMoodHistoryRecord).not.toHaveBeenCalled();
  });

  it("keeps the confirmation flow even if the local history write fails", async () => {
    const onSubmitMood = jest.fn().mockResolvedValue(undefined);
    const extractedHistoryInput = {
      mood_type: "calm",
      tags: [],
      hour_of_day: 14,
      submission_date: "2026-06-16",
    };
    const createdHistoryRecord = {
      id: "history-2",
      mood_type: "calm",
      tags: [],
      hour_of_day: 14,
      submission_date: "2026-06-16",
      recorded_at: "2026-06-16T14:30:00.000Z",
    };

    jest
      .mocked(extractLocalMoodHistoryRecordInput)
      .mockReturnValue(extractedHistoryInput);
    jest
      .mocked(createLocalMoodHistoryRecord)
      .mockReturnValue(createdHistoryRecord);
    jest
      .mocked(appendLocalMoodHistoryRecord)
      .mockRejectedValue(new Error("storage failed"));

    const { findByTestId, getByText } = await renderScreen({ onSubmitMood });

    fireEvent.press(await findByTestId("mood-calm"));
    fireEvent.press(await findByTestId("submit-button"));

    await waitFor(() => expect(onSubmitMood).toHaveBeenCalledTimes(1));
    await findByTestId("submission-confirmation");
    expect(getByText("Marble shared anonymously.")).toBeTruthy();
    expect(appendLocalMoodHistoryRecord).toHaveBeenCalledWith(
      createdHistoryRecord,
    );
  });

  it("shows the rate-limit message returned by the backend", async () => {
    const onSubmitMood = jest
      .fn()
      .mockRejectedValue(new Error("Daily mood submission limit reached."));
    const { findByTestId, getByText } = await renderScreen({ onSubmitMood });

    fireEvent.press(await findByTestId("mood-focused"));
    fireEvent.press(await findByTestId("submit-button"));

    await waitFor(() =>
      expect(getByText("Daily mood submission limit reached.")).toBeTruthy(),
    );
  });

  it("opens the local history flow from the member home screen", async () => {
    const onOpenHistory = jest.fn();
    const { findByTestId } = await renderScreen({ onOpenHistory });

    fireEvent.press(await findByTestId("open-history-button"));

    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});

async function renderScreen(
  overrides?: Partial<ComponentProps<typeof MarbleTrayScreen>>,
) {
  return render(
    <MarbleTrayScreen
      deviceJwt="device-jwt-token"
      getCurrentHour={() => 14}
      getCurrentSubmissionDate={() => "2026-06-16"}
      teamId="tm_test"
      workspaceId="ws_test"
      {...overrides}
    />,
  );
}
