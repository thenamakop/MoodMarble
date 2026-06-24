import type { ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";

afterEach(() => {
  cleanup();
});

describe("OnboardingScreen", () => {
  it("submits a valid join code to the workspace lookup", async () => {
    const onJoinWorkspace = jest.fn().mockResolvedValue({
      workspace: {
        id: "ws_localdemo",
        name: "MoodMarble Local Workspace",
      },
      teams: [
        {
          id: "tm_product",
          name: "Product",
        },
      ],
      device_jwt: "device-jwt-token",
    });
    const view = await renderScreen({
      onJoinWorkspace,
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "abc123");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    await waitFor(() => expect(onJoinWorkspace).toHaveBeenCalledWith("ABC123"));
  });

  it("shows the onboarding copy and progresses through the 3 slides", async () => {
    const view = await renderScreen();

    expect(await view.findByText("Anonymous by design")).toBeTruthy();
    expect(
      await view.findByText(
        "No login, no profile, and no name attached. MoodMarble keeps your check-ins private and lightweight.",
      ),
    ).toBeTruthy();

    fireEvent.press(await view.findByTestId("next-onboarding-button"));

    expect(await view.findByText("Join with a 6-character code")).toBeTruthy();
    expect(
      await view.findByText(
        "Enter your workspace code, choose your team, and get into the app in a few taps.",
      ),
    ).toBeTruthy();

    fireEvent.press(await view.findByTestId("next-onboarding-button"));

    expect(
      await view.findByText("Share how your marble is rolling"),
    ).toBeTruthy();
    expect(await view.findByText("Enter join code")).toBeTruthy();

    fireEvent.press(await view.findByTestId("next-onboarding-button"));

    expect(await view.findByTestId("join-code-input")).toBeTruthy();
  });

  it("supports back navigation during the onboarding slides", async () => {
    const view = await renderScreen();

    fireEvent.press(await view.findByTestId("next-onboarding-button"));
    fireEvent.press(await view.findByTestId("next-onboarding-button"));
    fireEvent.press(await view.findByTestId("back-onboarding-button"));

    expect(await view.findByText("Join with a 6-character code")).toBeTruthy();
  });

  it("can skip directly into the join-code screen", async () => {
    const view = await renderScreen();

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));

    expect(await view.findByTestId("join-code-input")).toBeTruthy();
    expect(
      await view.findByText("Join your workspace anonymously."),
    ).toBeTruthy();
  });

  it("replays only the intro when an existing anonymous session is provided", async () => {
    const onSessionReady = jest.fn().mockResolvedValue(undefined);
    const view = await renderScreen({
      onSessionReady,
      replaySession: {
        workspaceId: "ws_localdemo",
        teamId: "tm_engineering",
        deviceJwt: "active-device-jwt",
      },
    });

    fireEvent.press(await view.findByTestId("next-onboarding-button"));
    fireEvent.press(await view.findByTestId("next-onboarding-button"));

    expect(await view.findByText("Back to marbles")).toBeTruthy();

    fireEvent.press(await view.findByTestId("next-onboarding-button"));

    await waitFor(() =>
      expect(onSessionReady).toHaveBeenCalledWith({
        workspaceId: "ws_localdemo",
        teamId: "tm_engineering",
        deviceJwt: "active-device-jwt",
      }),
    );
    expect(view.queryByTestId("join-code-input")).toBeNull();
  });

  it("validates the join code before calling the API", async () => {
    const onJoinWorkspace = jest.fn();
    const view = await renderScreen({
      onJoinWorkspace,
      onSessionReady: jest.fn(),
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "abc12");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    expect(onJoinWorkspace).not.toHaveBeenCalled();
    expect(
      await view.findByText(
        "Join code must be exactly 6 alphanumeric characters.",
      ),
    ).toBeTruthy();
  });

  it("renders the workspace team list after a successful join lookup", async () => {
    const view = await renderScreen({
      onJoinWorkspace: jest.fn().mockResolvedValue({
        workspace: {
          id: "ws_localdemo",
          name: "MoodMarble Local Workspace",
        },
        teams: [
          {
            id: "tm_product",
            name: "Product",
          },
          {
            id: "tm_engineering",
            name: "Engineering",
          },
        ],
        device_jwt: "device-jwt-token",
      }),
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "abc123");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    expect(await view.findByText("MoodMarble Local Workspace")).toBeTruthy();
    expect(await view.findByTestId("team-option-tm_product")).toBeTruthy();
    expect(await view.findByTestId("team-option-tm_engineering")).toBeTruthy();
  });

  it("requires selecting exactly one team before continuing", async () => {
    const onCompleteTeamSelection = jest.fn().mockResolvedValue(undefined);
    const onSessionReady = jest.fn().mockResolvedValue(undefined);
    const view = await renderScreen({
      onCompleteTeamSelection,
      onSessionReady,
      onJoinWorkspace: jest.fn().mockResolvedValue({
        workspace: {
          id: "ws_localdemo",
          name: "MoodMarble Local Workspace",
        },
        teams: [
          {
            id: "tm_product",
            name: "Product",
          },
          {
            id: "tm_engineering",
            name: "Engineering",
          },
        ],
        device_jwt: "device-jwt-token",
      }),
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "abc123");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    const continueButton = await view.findByTestId(
      "complete-onboarding-button",
    );
    fireEvent.press(continueButton);
    expect(onSessionReady).not.toHaveBeenCalled();
    expect(onCompleteTeamSelection).not.toHaveBeenCalled();

    fireEvent.press(await view.findByTestId("team-option-tm_engineering"));

    expect(await view.findByText("Selected")).toBeTruthy();
    expect(await view.findByTestId("team-option-tm_engineering")).toHaveProp(
      "accessibilityState",
      { selected: true },
    );
    expect(await view.findByTestId("team-option-tm_product")).toHaveProp(
      "accessibilityState",
      { selected: false },
    );
    fireEvent.press(await view.findByTestId("complete-onboarding-button"));
    await waitFor(() =>
      expect(onCompleteTeamSelection).toHaveBeenCalledWith({
        teamId: "tm_engineering",
        deviceJwt: "device-jwt-token",
      }),
    );
    await waitFor(() =>
      expect(onSessionReady).toHaveBeenCalledWith({
        workspaceId: "ws_localdemo",
        teamId: "tm_engineering",
        deviceJwt: "device-jwt-token",
      }),
    );
  });

  it("shows the loading state while checking the join code", async () => {
    let resolveJoin:
      | ((value: {
          workspace: { id: string; name: string };
          teams: { id: string; name: string }[];
          device_jwt: string;
        }) => void)
      | null = null;

    const onJoinWorkspace = jest.fn(
      () =>
        new Promise<{
          workspace: { id: string; name: string };
          teams: { id: string; name: string }[];
          device_jwt: string;
        }>((resolve) => {
          resolveJoin = resolve;
        }),
    );
    const view = await renderScreen({
      onJoinWorkspace,
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "abc123");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    expect(await view.findByText("Checking code...")).toBeTruthy();

    resolveJoin?.({
      workspace: {
        id: "ws_localdemo",
        name: "MoodMarble Local Workspace",
      },
      teams: [
        {
          id: "tm_product",
          name: "Product",
        },
      ],
      device_jwt: "device-jwt-token",
    });

    expect(await view.findByTestId("team-option-tm_product")).toBeTruthy();
  });

  it("shows the backend join error when the join code lookup fails", async () => {
    const view = await renderScreen({
      onJoinWorkspace: jest
        .fn()
        .mockRejectedValue(new Error("Join code not found.")),
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "ZZZ999");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    expect(await view.findByText("Join code not found.")).toBeTruthy();
  });

  it("surfaces development diagnostics from the join flow", async () => {
    const view = await renderScreen({
      onJoinWorkspace: jest
        .fn()
        .mockRejectedValue(
          new Error(
            "Unable to join workspace right now. Dev details: TypeError: Network request failed (http://10.0.2.2:3000/workspace/join)",
          ),
        ),
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "ABC123");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    expect(
      await view.findByText(
        "Unable to join workspace right now. Dev details: TypeError: Network request failed (http://10.0.2.2:3000/workspace/join)",
      ),
    ).toBeTruthy();
  });

  it("completes onboarding after join and team selection", async () => {
    const onCompleteTeamSelection = jest.fn().mockResolvedValue(undefined);
    const onSessionReady = jest.fn().mockResolvedValue(undefined);
    const onJoinWorkspace = jest.fn().mockResolvedValue({
      workspace: {
        id: "ws_localdemo",
        name: "MoodMarble Local Workspace",
      },
      teams: [
        {
          id: "tm_product",
          name: "Product",
        },
        {
          id: "tm_engineering",
          name: "Engineering",
        },
      ],
      device_jwt: "device-jwt-token",
    });
    const view = await renderScreen({
      onCompleteTeamSelection,
      onJoinWorkspace,
      onSessionReady,
    });

    fireEvent.press(await view.findByTestId("skip-onboarding-button"));
    fireEvent.changeText(await view.findByTestId("join-code-input"), "abc123");
    fireEvent.press(await view.findByTestId("join-workspace-button"));

    await waitFor(() => expect(onJoinWorkspace).toHaveBeenCalledWith("ABC123"));

    fireEvent.press(await view.findByTestId("team-option-tm_engineering"));
    fireEvent.press(await view.findByTestId("complete-onboarding-button"));

    await waitFor(() =>
      expect(onCompleteTeamSelection).toHaveBeenCalledWith({
        teamId: "tm_engineering",
        deviceJwt: "device-jwt-token",
      }),
    );
    await waitFor(() =>
      expect(onSessionReady).toHaveBeenCalledWith({
        workspaceId: "ws_localdemo",
        teamId: "tm_engineering",
        deviceJwt: "device-jwt-token",
      }),
    );
  });

  it("renders the admin access link subtly after intro slides", async () => {
    const view = await renderScreen();

    // Admin link should not be present during intro slides
    expect(view.queryByTestId("admin-entry-link")).toBeNull();

    // Skip to join-code step
    fireEvent.press(await view.findByTestId("skip-onboarding-button"));

    // Admin link should be present now
    expect(await view.findByTestId("admin-entry-link")).toBeTruthy();
    expect(await view.findByText("Admin access")).toBeTruthy();
  });
});

async function renderScreen(
  overrides?: Partial<ComponentProps<typeof OnboardingScreen>>,
) {
  return render(<OnboardingScreen onSessionReady={jest.fn()} {...overrides} />);
}
