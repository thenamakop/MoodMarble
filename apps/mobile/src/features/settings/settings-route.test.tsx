import { fireEvent, render, waitFor } from "@testing-library/react-native";

import SettingsRoute from "@/app/(tabs)/settings";
import { clearLocalDeviceData } from "@/features/settings/local-data";
import { requestStoredOnboardingReplay } from "@/features/settings/storage";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/features/settings/local-data", () => ({
  clearLocalDeviceData: jest.fn(async () => undefined),
}));

jest.mock("@/features/settings/storage", () => ({
  requestStoredOnboardingReplay: jest.fn(async () => ({
    version: 1,
    remindersEnabled: false,
    reminderTimes: ["18:00"],
    replayOnboarding: true,
  })),
}));

jest.mock("@/features/settings/settings-screen", () => {
  // require() is necessary here: jest.mock factories are hoisted before
  // import statements, so ES imports are not yet bound at this point.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, View } = require("react-native");

  return {
    SettingsScreen: ({
      onClearLocalData,
      onRequestOnboardingReplay,
      onReturnHome,
      onSignOut,
    }: {
      onClearLocalData?: () => Promise<void> | void;
      onRequestOnboardingReplay?: () => Promise<void> | void;
      onReturnHome?: () => void;
      onSignOut?: () => Promise<void> | void;
    }) => (
      <View>
        <Text>settings-screen-route</Text>
        <Pressable onPress={onReturnHome} testID="settings-route-return-home">
          <Text>return-home</Text>
        </Pressable>
        <Pressable onPress={onRequestOnboardingReplay} testID="settings-route-replay">
          <Text>replay</Text>
        </Pressable>
        <Pressable onPress={onClearLocalData} testID="settings-route-clear-local-data">
          <Text>clear-local-data</Text>
        </Pressable>
        <Pressable onPress={onSignOut} testID="settings-route-sign-out">
          <Text>sign-out</Text>
        </Pressable>
      </View>
    ),
  };
});

const { useRouter } = jest.requireMock("expo-router") as {
  useRouter: jest.Mock;
};

describe("SettingsRoute", () => {
  const replace = jest.fn();

  beforeEach(() => {
    useRouter.mockReturnValue({ replace });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the settings screen inside the member route surface", async () => {
    const view = await render(<SettingsRoute />);

    expect(view.getByText("settings-screen-route")).toBeTruthy();
  });

  it("returns to the main app with a replace navigation", async () => {
    const view = await render(<SettingsRoute />);

    fireEvent.press(view.getByTestId("settings-route-return-home"));

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("replays onboarding from settings and returns to the main app", async () => {
    const view = await render(<SettingsRoute />);

    fireEvent.press(view.getByTestId("settings-route-replay"));

    await waitFor(() => expect(requestStoredOnboardingReplay).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("clears local data from settings and returns to the main app", async () => {
    const view = await render(<SettingsRoute />);

    fireEvent.press(view.getByTestId("settings-route-clear-local-data"));

    await waitFor(() => expect(clearLocalDeviceData).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("signs out: clears local device data and returns to the main app", async () => {
    const view = await render(<SettingsRoute />);

    fireEvent.press(view.getByTestId("settings-route-sign-out"));

    await waitFor(() => expect(clearLocalDeviceData).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("navigates away from settings even when sign-out cleanup fails", async () => {
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    (clearLocalDeviceData as jest.Mock).mockRejectedValueOnce(new Error("Cleanup failed"));

    const view = await render(<SettingsRoute />);

    fireEvent.press(view.getByTestId("settings-route-sign-out"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(clearLocalDeviceData).toHaveBeenCalledTimes(1);
    consoleWarn.mockRestore();
  });
});
