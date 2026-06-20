import { render, waitFor } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
  })),
}));

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-notifications", () => {
  throw new Error(
    "expo-notifications should stay lazy during settings route startup",
  );
});

jest.mock("@/features/notifications/scheduler", () => {
  throw new Error("scheduler should stay lazy during settings route startup");
});

jest.mock("@/features/notifications/platform", () => ({
  getReminderRuntimeSupport: jest.fn(() => ({
    supportsLocalNotifications: true,
    canManageSchedules: false,
    requiresDevelopmentBuild: true,
    notice:
      "Reminder times still save on this device. Android reminder notifications require a development build because Expo Go does not support this native runtime.",
  })),
}));

import SettingsRoute from "@/app/settings";

describe("settings startup safety", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the settings route without importing scheduler or expo-notifications on startup", async () => {
    const view = await render(<SettingsRoute />);

    await waitFor(() => expect(view.getByText("Settings")).toBeTruthy());
    expect(view.getByText("Daily reminders")).toBeTruthy();
    expect(view.getByText("Replay onboarding")).toBeTruthy();
    expect(
      view.getByText(
        "Reminder times still save on this device. Android reminder notifications require a development build because Expo Go does not support this native runtime.",
      ),
    ).toBeTruthy();
  });
});
