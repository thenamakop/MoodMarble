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
  it("validates the join code before calling the API", async () => {
    const onJoinWorkspace = jest.fn();
    const view = await renderScreen({
      onJoinWorkspace,
      onSessionReady: jest.fn(),
    });

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
