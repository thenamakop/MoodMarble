import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import HomeScreen from "@/app/index";
import { resolveAnonymousHomeState } from "@/features/onboarding/route-boundary";
import { saveAnonymousSession } from "@/features/onboarding/session";
import { restoreAnonymousSession } from "@/features/onboarding/session-boundary";
import {
  clearStoredOnboardingReplayRequest,
  loadLocalSettings,
} from "@/features/settings/storage";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    background: "#ffffff",
    text: "#111111",
  }),
}));

jest.mock("@/features/onboarding/route-boundary", () => ({
  resolveAnonymousHomeState: jest.fn((session) =>
    session ? "member-home" : "onboarding",
  ),
}));

jest.mock("@/features/onboarding/session", () => ({
  saveAnonymousSession: jest.fn(),
}));

jest.mock("@/features/onboarding/session-boundary", () => ({
  getAnonymousSessionFromParams: jest.fn(() => null),
  restoreAnonymousSession: jest.fn(),
}));

jest.mock("@/features/settings/storage", () => ({
  clearStoredOnboardingReplayRequest: jest.fn(async () => ({
    version: 1,
    remindersEnabled: false,
    reminderTimes: ["18:00"],
    replayOnboarding: false,
  })),
  loadLocalSettings: jest.fn(async () => ({
    version: 1,
    remindersEnabled: false,
    reminderTimes: ["18:00"],
    replayOnboarding: false,
  })),
}));

jest.mock("@/features/onboarding/onboarding-screen", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  return {
    OnboardingScreen: ({
      onSessionReady,
    }: {
      onSessionReady: (session: {
        workspaceId: string;
        teamId: string;
        deviceJwt: string;
      }) => Promise<void> | void;
    }) => (
      <Pressable
        onPress={() =>
          onSessionReady({
            workspaceId: "ws_joined",
            teamId: "tm_product",
            deviceJwt: "joined-device-jwt",
          })
        }
        testID="complete-onboarding"
      >
        <Text>onboarding-screen</Text>
      </Pressable>
    ),
  };
});

jest.mock("@/features/mood-submission/marble-tray-screen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    MarbleTrayScreen: ({
      workspaceId,
      teamId,
      deviceJwt,
      onOpenHistory,
    }: {
      workspaceId?: string;
      teamId?: string;
      deviceJwt?: string;
      onOpenHistory?: () => void;
    }) => (
      <View>
        <Text>{`marble-tray:${workspaceId ?? "none"}:${teamId ?? "none"}:${deviceJwt ?? "none"}`}</Text>
        {onOpenHistory ? (
          <Pressable onPress={onOpenHistory} testID="open-history">
            <Text>open-history</Text>
          </Pressable>
        ) : null}
      </View>
    ),
  };
});

jest.mock("@/features/history/history-screen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    LocalHistoryScreen: ({ onReturnHome }: { onReturnHome?: () => void }) => (
      <View>
        <Text>local-history-screen</Text>
        <Pressable onPress={onReturnHome} testID="return-home">
          <Text>return-home</Text>
        </Pressable>
      </View>
    ),
  };
});

const { useLocalSearchParams, useRouter } = jest.requireMock("expo-router") as {
  useLocalSearchParams: jest.Mock;
  useRouter: jest.Mock;
};

describe("HomeScreen", () => {
  beforeEach(() => {
    useRouter.mockReturnValue({
      replace: jest.fn(),
    });
    useLocalSearchParams.mockImplementation(() => ({}));
    jest.mocked(saveAnonymousSession).mockResolvedValue(undefined);
    jest
      .mocked(resolveAnonymousHomeState)
      .mockImplementation((session) =>
        session ? "member-home" : "onboarding",
      );
    jest.mocked(loadLocalSettings).mockResolvedValue({
      version: 1,
      remindersEnabled: false,
      reminderTimes: ["18:00"],
      replayOnboarding: false,
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("continues anonymously and stays on the member home after onboarding completes", async () => {
    jest.mocked(restoreAnonymousSession).mockResolvedValue(null);

    const view = await render(<HomeScreen />);

    expect(await view.findByText("onboarding-screen")).toBeTruthy();

    fireEvent.press(await view.findByTestId("complete-onboarding"));

    await waitFor(() =>
      expect(
        view.getByText("marble-tray:ws_joined:tm_product:joined-device-jwt"),
      ).toBeTruthy(),
    );

    expect(saveAnonymousSession).toHaveBeenCalledWith({
      workspaceId: "ws_joined",
      teamId: "tm_product",
      deviceJwt: "joined-device-jwt",
    });
    expect(view.queryByText("onboarding-screen")).toBeNull();
  });

  it("does not re-run session restore when the params object identity changes but values do not", async () => {
    useLocalSearchParams.mockImplementation(() => ({}));
    jest.mocked(restoreAnonymousSession).mockImplementation(async () => ({
      workspaceId: "ws_localdemo",
      teamId: "tm_engineering",
      deviceJwt: "active-device-jwt",
    }));

    const view = await render(<HomeScreen />);

    await waitFor(() =>
      expect(
        view.getByText(
          "marble-tray:ws_localdemo:tm_engineering:active-device-jwt",
        ),
      ).toBeTruthy(),
    );

    await waitFor(() =>
      expect(restoreAnonymousSession).toHaveBeenCalledTimes(1),
    );
  });

  it("does not let a late restore overwrite a session that was just created", async () => {
    let currentParams: Record<string, string> = {};
    const pendingRestore = createDeferred<null>();

    useLocalSearchParams.mockImplementation(() => currentParams);
    jest
      .mocked(restoreAnonymousSession)
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(() => pendingRestore.promise);

    const view = await render(<HomeScreen />);

    expect(await view.findByText("onboarding-screen")).toBeTruthy();

    currentParams = { workspace_id: "refresh-trigger" };
    view.rerender(<HomeScreen />);

    await waitFor(() =>
      expect(restoreAnonymousSession).toHaveBeenCalledTimes(2),
    );

    fireEvent.press(await view.findByTestId("complete-onboarding"));

    await waitFor(() =>
      expect(
        view.getByText("marble-tray:ws_joined:tm_product:joined-device-jwt"),
      ).toBeTruthy(),
    );

    pendingRestore.resolve(null);

    await waitFor(() =>
      expect(
        view.getByText("marble-tray:ws_joined:tm_product:joined-device-jwt"),
      ).toBeTruthy(),
    );
    expect(view.queryByText("onboarding-screen")).toBeNull();
  });

  it("uses a native history handoff without losing the active session", async () => {
    jest.mocked(restoreAnonymousSession).mockResolvedValue({
      workspaceId: "ws_localdemo",
      teamId: "tm_engineering",
      deviceJwt: "active-device-jwt",
    });

    const view = await render(<HomeScreen />);

    await waitFor(() =>
      expect(
        view.getByText(
          "marble-tray:ws_localdemo:tm_engineering:active-device-jwt",
        ),
      ).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId("open-history"));

    await waitFor(() =>
      expect(view.getByText("local-history-screen")).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId("return-home"));

    await waitFor(() =>
      expect(
        view.getByText(
          "marble-tray:ws_localdemo:tm_engineering:active-device-jwt",
        ),
      ).toBeTruthy(),
    );
  });

  it("replays onboarding when a local replay request is waiting", async () => {
    jest.mocked(restoreAnonymousSession).mockResolvedValue({
      workspaceId: "ws_localdemo",
      teamId: "tm_engineering",
      deviceJwt: "active-device-jwt",
    });
    jest.mocked(loadLocalSettings).mockResolvedValue({
      version: 1,
      remindersEnabled: false,
      reminderTimes: ["18:00"],
      replayOnboarding: true,
    });

    const view = await render(<HomeScreen />);

    await waitFor(() =>
      expect(view.getByText("onboarding-screen")).toBeTruthy(),
    );
    expect(clearStoredOnboardingReplayRequest).toHaveBeenCalledTimes(1);
    expect(
      view.queryByText(
        "marble-tray:ws_localdemo:tm_engineering:active-device-jwt",
      ),
    ).toBeNull();
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
