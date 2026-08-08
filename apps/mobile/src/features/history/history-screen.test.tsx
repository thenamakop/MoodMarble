import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { LocalHistoryScreen } from "@/features/history/history-screen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/features/history/timeline-screen", () => ({
  LocalMoodTimelineScreen: ({
    moodFilter,
    nested,
  }: {
    moodFilter?: string | null;
    nested?: boolean;
  }) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>timeline-view</Text>
        <Text testID="timeline-nested-prop">{String(nested)}</Text>
        {moodFilter ? <Text testID="timeline-active-filter">{moodFilter}</Text> : null}
      </View>
    );
  },
}));

jest.mock("@/features/history/calendar-screen", () => ({
  LocalMoodCalendarScreen: ({ nested }: { nested?: boolean }) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>calendar-view</Text>
        <Text testID="calendar-nested-prop">{String(nested)}</Text>
      </View>
    );
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

  it("renders the mood filter dropdown", async () => {
    useRouter.mockReturnValue({ push: jest.fn() });

    const view = await render(<LocalHistoryScreen />);

    await waitFor(() => expect(view.getByTestId("mood-filter-dropdown")).toBeTruthy());
    expect(view.getByText("Filter: All")).toBeTruthy();
  });

  it("filters the timeline through the dropdown menu", async () => {
    useRouter.mockReturnValue({ push: jest.fn() });

    const view = await render(<LocalHistoryScreen />);

    await waitFor(() => expect(view.getByTestId("mood-filter-dropdown")).toBeTruthy());

    // No filter is active initially
    expect(view.queryByTestId("timeline-active-filter")).toBeNull();

    // Open the dropdown menu
    fireEvent.press(view.getByTestId("mood-filter-dropdown"));
    await waitFor(() => expect(view.getByTestId("mood-filter-menu")).toBeTruthy());

    // Select a mood
    fireEvent.press(view.getByTestId("mood-filter-option-happy"));
    await waitFor(() => expect(view.getByTestId("timeline-active-filter")).toBeTruthy());
    expect(view.getByTestId("timeline-active-filter").props.children).toBe("happy");

    // Open the dropdown again and reset to "All"
    fireEvent.press(view.getByTestId("mood-filter-dropdown"));
    await waitFor(() => expect(view.getByTestId("mood-filter-option-all")).toBeTruthy());
    fireEvent.press(view.getByTestId("mood-filter-option-all"));
    await waitFor(() => expect(view.queryByTestId("timeline-active-filter")).toBeNull());
  });
});
