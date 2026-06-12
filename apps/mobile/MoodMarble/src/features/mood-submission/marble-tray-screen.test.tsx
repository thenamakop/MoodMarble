import type { ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { MarbleTrayScreen } from "@/features/mood-submission/marble-tray-screen";

afterEach(() => {
  cleanup();
});

describe("MarbleTrayScreen", () => {
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
      },
      "device-jwt-token",
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
    const { findByTestId, getByText, queryByText } = await renderScreen({
      onSubmitMood,
    });

    fireEvent.press(await findByTestId("mood-focused"));
    fireEvent.press(await findByTestId("submit-button"));

    await waitFor(() => expect(getByText("Sharing...")).toBeTruthy());
    expect(queryByText("Unable to submit mood right now.")).toBeNull();

    rejectSubmission?.();

    await waitFor(() =>
      expect(getByText("Unable to submit mood right now.")).toBeTruthy(),
    );
  });
});

async function renderScreen(
  overrides?: Partial<ComponentProps<typeof MarbleTrayScreen>>,
) {
  return render(
    <MarbleTrayScreen
      deviceJwt="device-jwt-token"
      getCurrentHour={() => 14}
      teamId="tm_test"
      workspaceId="ws_test"
      {...overrides}
    />,
  );
}
