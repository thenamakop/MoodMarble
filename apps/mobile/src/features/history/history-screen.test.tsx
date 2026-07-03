import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { LocalHistoryScreen } from "@/features/history/history-screen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/features/history/timeline-screen", () => ({
  LocalMoodTimelineScreen: ({ moodFilter }: { moodFilter?: string | null }) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>timeline-view</Text>
        {moodFilter ? <Text testID="timeline-active-filter">{moodFilter}</Text> : null}
      </View>
    );
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

    const view = await render(<LocalHistoryScreen onReturnHome={onReturnHome} />);

    fireEvent.press(view.getByTestId("history-return-home"));

    expect(onReturnHome).toHaveBeenCalledTimes(1);
  });

  it("renders mood filter dropdown", async () => {
    useRouter.mockReturnValue({ push: jest.fn() });

    const view = await render(<LocalHistoryScreen />);

    await waitFor(() => expect(view.getByTestId("mood-filter-dropdown-button")).toBeTruthy());
  });

  it("filters timeline from the mood dropdown", async () => {
    useRouter.mockReturnValue({ push: jest.fn() });

    const view = await render(<LocalHistoryScreen />);

    await waitFor(() => expect(view.getByTestId("mood-filter-dropdown-button")).toBeTruthy());

    // No filter active initially
    expect(view.queryByTestId("timeline-active-filter")).toBeNull();

    // Open the dropdown and select the "happy" mood
    fireEvent.press(view.getByTestId("mood-filter-dropdown-button"));
    await waitFor(() => expect(view.getByTestId("mood-filter-happy")).toBeTruthy());
    fireEvent.press(view.getByTestId("mood-filter-happy"));

    await waitFor(() => expect(view.getByTestId("timeline-active-filter")).toBeTruthy());
    expect(view.getByTestId("timeline-active-filter").props.children).toBe("happy");

    // Open the dropdown and select "All moods" to clear the filter
    fireEvent.press(view.getByTestId("mood-filter-dropdown-button"));
    await waitFor(() => expect(view.getByTestId("mood-filter-all")).toBeTruthy());
    fireEvent.press(view.getByTestId("mood-filter-all"));

    await waitFor(() => expect(view.queryByTestId("timeline-active-filter")).toBeNull());
  });
});
