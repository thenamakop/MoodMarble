import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { SettingsScreen } from "@/features/settings/settings-screen";

jest.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: "default",
  },
  AndroidNotificationVisibility: {
    PUBLIC: "public",
  },
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => "scheduled-id"),
  setNotificationChannelAsync: jest.fn(async () => undefined),
}));

const defaultSettings = {
  version: 1 as const,
  remindersEnabled: false,
  reminderTimes: ["18:00"],
  replayOnboarding: false,
};

describe("SettingsScreen", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("renders the Week 6 settings controls for local reminders and privacy actions", async () => {
    const view = await renderScreen();

    expect(view.getByText("Daily reminders")).toBeTruthy();
    expect(view.getByDisplayValue("18:00")).toBeTruthy();
    expect(view.getByText("Replay onboarding")).toBeTruthy();
    expect(view.getByText("Delete local data")).toBeTruthy();

    fireEvent.press(view.getByTestId("settings-replay-onboarding"));
    await waitFor(() =>
      expect(
        view.getByText(
          "Onboarding replay is ready the next time you return home.",
        ),
      ).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId("settings-open-clear-local-data"));
    await waitFor(() =>
      expect(view.getByTestId("settings-clear-local-data-prompt")).toBeTruthy(),
    );
    fireEvent.press(view.getByTestId("settings-confirm-clear-local-data"));
    await waitFor(() =>
      expect(
        view.getByText("Local data was cleared from this device."),
      ).toBeTruthy(),
    );
  });

  it("toggles reminders on and persists the local opt-in state", async () => {
    const saveSettings = jest.fn(async (settings) => settings);
    const view = await renderScreen({ saveSettings });

    fireEvent(
      view.getByTestId("settings-reminders-switch"),
      "valueChange",
      true,
    );

    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith({
        ...defaultSettings,
        remindersEnabled: true,
      }),
    );
    expect(
      view.getByText("Daily reminders are on for this device."),
    ).toBeTruthy();
  });

  it("turns reminders off without losing the saved local reminder times", async () => {
    const enabledSettings = {
      version: 1 as const,
      remindersEnabled: true,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    };
    const saveSettings = jest.fn(async (settings) => settings);
    const view = await renderScreen({
      loadSettings: jest.fn().mockResolvedValue(enabledSettings),
      saveSettings,
    });

    fireEvent(
      view.getByTestId("settings-reminders-switch"),
      "valueChange",
      false,
    );

    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith({
        ...enabledSettings,
        remindersEnabled: false,
      }),
    );
    expect(
      view.getByText(
        "Daily reminders are off. Your saved times stay on this device.",
      ),
    ).toBeTruthy();
  });

  it("lets the user edit 1 to 3 reminder times and apply the saved schedule", async () => {
    const saveSettings = jest.fn(async (settings) => settings);
    const view = await renderScreen({ saveSettings });

    fireEvent.press(view.getByTestId("settings-add-reminder-time"));
    await waitFor(() =>
      expect(view.getByTestId("settings-reminder-time-1")).toBeTruthy(),
    );
    fireEvent.changeText(view.getByTestId("settings-reminder-time-0"), "20:45");
    fireEvent.changeText(view.getByTestId("settings-reminder-time-1"), "08:30");

    await waitFor(() => expect(view.getByDisplayValue("20:45")).toBeTruthy());
    await waitFor(() => expect(view.getByDisplayValue("08:30")).toBeTruthy());

    fireEvent.press(view.getByTestId("settings-apply-reminder-times"));
    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith({
        ...defaultSettings,
        reminderTimes: ["08:30", "20:45"],
      }),
    );
  });
});

async function renderScreen(
  overrides: Partial<ComponentProps<typeof SettingsScreen>> = {},
) {
  const view = await render(
    <SettingsScreen
      loadSettings={jest.fn().mockResolvedValue(defaultSettings)}
      onClearLocalData={jest.fn()}
      onRequestOnboardingReplay={jest.fn()}
      onReturnHome={jest.fn()}
      saveSettings={jest.fn().mockResolvedValue(defaultSettings)}
      {...overrides}
    />,
  );

  await waitFor(() => expect(view.getByText("Settings")).toBeTruthy());
  return view;
}
