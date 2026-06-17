import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { LocalHistoryScreen } from "@/features/history/history-screen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/features/history/timeline-screen", () => ({
  LocalMoodTimelineScreen: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return <Text>timeline-view</Text>;
  },
}));

jest.mock("@/features/history/calendar-screen", () => ({
  LocalMoodCalendarScreen: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return <Text>calendar-view</Text>;
  },
}));

const { useRouter } = jest.requireMock("expo-router") as {
  useRouter: jest.Mock;
};

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("LocalHistoryScreen", () => {
  it("shows the timeline view by default", async () => {
    useRouter.mockReturnValue({
      push: jest.fn(),
    });

    const view = await render(<LocalHistoryScreen />);

    await waitFor(() => expect(view.getByText("timeline-view")).toBeTruthy());
    expect(view.getByTestId("history-panel-timeline")).toBeTruthy();
  });

  it("switches from the timeline view to the calendar view", async () => {
    useRouter.mockReturnValue({
      push: jest.fn(),
    });

    const view = await render(<LocalHistoryScreen />);

    fireEvent.press(view.getByTestId("history-view-calendar"));

    await waitFor(() => expect(view.getByText("calendar-view")).toBeTruthy());
    expect(view.getByTestId("history-panel-calendar")).toBeTruthy();
  });

  it("returns to the main app screen", async () => {
    const onReturnHome = jest.fn();
    useRouter.mockReturnValue({
      push: jest.fn(),
    });

    const view = await render(
      <LocalHistoryScreen onReturnHome={onReturnHome} />,
    );

    fireEvent.press(view.getByTestId("history-return-home"));

    expect(onReturnHome).toHaveBeenCalledTimes(1);
  });
});
