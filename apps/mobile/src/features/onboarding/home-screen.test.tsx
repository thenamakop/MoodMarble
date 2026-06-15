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
  const { Text } = require("react-native");

  return {
    MarbleTrayScreen: ({
      workspaceId,
      teamId,
      deviceJwt,
    }: {
      workspaceId?: string;
      teamId?: string;
      deviceJwt?: string;
    }) => (
      <Text>{`marble-tray:${workspaceId ?? "none"}:${teamId ?? "none"}:${deviceJwt ?? "none"}`}</Text>
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
});
