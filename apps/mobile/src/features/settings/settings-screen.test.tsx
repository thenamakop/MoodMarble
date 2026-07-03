import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { SettingsScreen } from "@/features/settings/settings-screen";

const mockSetThemePreference = jest.fn(async () => undefined);

jest.mock("@/features/theme/provider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useThemeContext: jest.fn(() => ({
    themePreference: "system",
    resolvedTheme: "light",
    setThemePreference: mockSetThemePreference,
    isLoading: false,
  })),
}));

jest.mock("@/features/notifications/platform", () => ({
  getReminderRuntimeSupport: jest.fn(() => ({
    supportsLocalNotifications: true,
    canManageSchedules: true,
    requiresDevelopmentBuild: false,
    notice: null,
  })),
}));

jest.mock("@/features/notifications/permissions", () => ({
  getNotificationPermissionStatus: jest.fn(async () => "undetermined"),
  requestNotificationPermission: jest.fn(async () => "granted"),
}));

const { getReminderRuntimeSupport } = jest.requireMock("@/features/notifications/platform") as {
  getReminderRuntimeSupport: jest.Mock;
};

const { getNotificationPermissionStatus, requestNotificationPermission } = jest.requireMock(
  "@/features/notifications/permissions",
) as {
  getNotificationPermissionStatus: jest.Mock;
  requestNotificationPermission: jest.Mock;
};

const defaultSettings = {
  version: 1 as const,
  remindersEnabled: false,
  reminderTimes: ["18:00"],
  replayOnboarding: false,
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    getReminderRuntimeSupport.mockReturnValue({
      supportsLocalNotifications: true,
      canManageSchedules: true,
      requiresDevelopmentBuild: false,
      notice: null,
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("renders the appearance section and persists the selected theme", async () => {
    const view = await renderScreen();

    expect(view.getByText("settings.appearanceSection.title")).toBeTruthy();
    expect(view.getByTestId("settings-theme-option-light")).toBeTruthy();
    expect(view.getByTestId("settings-theme-option-dark")).toBeTruthy();
    expect(view.getByTestId("settings-theme-option-system")).toBeTruthy();

    fireEvent.press(view.getByTestId("settings-theme-option-dark"));
    await waitFor(() => expect(mockSetThemePreference).toHaveBeenCalledWith("dark"));
  }, 10000);

  it("renders the Week 6 settings controls for local reminders and privacy actions", async () => {
    const view = await renderScreen();

    expect(view.getByText("settings.remindersSection.title")).toBeTruthy();
    expect(view.getByDisplayValue("18:00")).toBeTruthy();
    expect(view.getByText("settings.onboardingSection.replayButton")).toBeTruthy();
    expect(view.getByText("settings.localDataSection.deleteButton")).toBeTruthy();

    fireEvent.press(view.getByTestId("settings-replay-onboarding"));
    await waitFor(() =>
      expect(view.getByText("settings.statusMessages.onboardingReplayReady")).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId("settings-open-clear-local-data"));
    await waitFor(() => expect(view.getByTestId("settings-clear-local-data-prompt")).toBeTruthy());
    fireEvent.press(view.getByTestId("settings-confirm-clear-local-data"));
    await waitFor(() =>
      expect(view.getByText("settings.statusMessages.localDataCleared")).toBeTruthy(),
    );
  });

  it("renders the Sign out button and calls onSignOut when tapped", async () => {
    const onSignOut = jest.fn().mockResolvedValue(undefined);
    const view = await renderScreen({ onSignOut });

    expect(view.getByTestId("settings-sign-out")).toBeTruthy();
    fireEvent.press(view.getByTestId("settings-sign-out"));
    await waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });

  it("shows a clear error when clearing local data fails instead of staying in a busy state", async () => {
    const onClearLocalData = jest.fn().mockRejectedValue(new Error("Storage unavailable"));
    const view = await renderScreen({ onClearLocalData });

    fireEvent.press(view.getByTestId("settings-open-clear-local-data"));
    await waitFor(() => expect(view.getByTestId("settings-clear-local-data-prompt")).toBeTruthy());
    fireEvent.press(view.getByTestId("settings-confirm-clear-local-data"));
    await waitFor(() => expect(view.getByText("Storage unavailable")).toBeTruthy());
    expect(view.queryByText("settings.loadingSettings")).toBeNull();
  });

  it("shows a clear error when sign-out fails", async () => {
    const onSignOut = jest.fn().mockRejectedValue(new Error("Session reset failed"));
    const view = await renderScreen({ onSignOut });

    fireEvent.press(view.getByTestId("settings-sign-out"));
    await waitFor(() => expect(view.getByText("Session reset failed")).toBeTruthy());
  });

  it("toggles reminders on and persists the local opt-in state after permission is granted", async () => {
    const saveSettings = jest.fn(async (settings) => settings);
    const view = await renderScreen({ saveSettings });

    fireEvent(view.getByTestId("settings-reminders-switch"), "valueChange", true);

    await waitFor(() => expect(requestNotificationPermission).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith({
        ...defaultSettings,
        remindersEnabled: true,
      }),
    );
    expect(view.getByText("settings.statusMessages.remindersOn")).toBeTruthy();
  });

  it("does not enable reminders when notification permission is denied", async () => {
    requestNotificationPermission.mockResolvedValueOnce("denied");
    const saveSettings = jest.fn(async (settings) => settings);
    const view = await renderScreen({ saveSettings });

    fireEvent(view.getByTestId("settings-reminders-switch"), "valueChange", true);

    await waitFor(() => expect(requestNotificationPermission).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(view.getByText("settings.errorMessages.permissionDenied")).toBeTruthy(),
    );
    expect(saveSettings).not.toHaveBeenCalled();
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

    fireEvent(view.getByTestId("settings-reminders-switch"), "valueChange", false);

    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith({
        ...enabledSettings,
        remindersEnabled: false,
      }),
    );
    expect(view.getByText("settings.statusMessages.remindersOff")).toBeTruthy();
  });

  it("lets the user edit 1 to 3 reminder times and apply the saved schedule", async () => {
    const saveSettings = jest.fn(async (settings) => settings);
    const view = await renderScreen({ saveSettings });

    fireEvent.press(view.getByTestId("settings-add-reminder-time"));
    await waitFor(() => expect(view.getByTestId("settings-reminder-time-1")).toBeTruthy());
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

async function renderScreen(overrides: Partial<ComponentProps<typeof SettingsScreen>> = {}) {
  const view = await render(
    <SettingsScreen
      loadSettings={jest.fn().mockResolvedValue(defaultSettings)}
      onClearLocalData={jest.fn()}
      onRequestOnboardingReplay={jest.fn()}
      onReturnHome={jest.fn()}
      onSignOut={jest.fn()}
      saveSettings={jest.fn().mockResolvedValue(defaultSettings)}
      getNotificationPermission={getNotificationPermissionStatus}
      requestNotificationPermission={requestNotificationPermission}
      openAppSettings={jest.fn()}
      {...overrides}
    />,
  );

  await waitFor(() => expect(view.getByText("settings.title")).toBeTruthy(), {
    timeout: 5000,
  });
  return view;
}
