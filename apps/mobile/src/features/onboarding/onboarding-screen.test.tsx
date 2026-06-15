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

  it("completes onboarding after join and team selection", async () => {
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
      expect(onSessionReady).toHaveBeenCalledWith({
        workspaceId: "ws_localdemo",
        teamId: "tm_engineering",
        deviceJwt: "device-jwt-token",
      }),
    );
  });
});

async function renderScreen(
  overrides?: Partial<ComponentProps<typeof OnboardingScreen>>,
) {
  return render(<OnboardingScreen onSessionReady={jest.fn()} {...overrides} />);
}
