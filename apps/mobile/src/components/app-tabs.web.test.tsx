import { render } from "@testing-library/react-native";
import { View } from "react-native";

import AppTabs from "@/components/app-tabs.web";

const mockPush = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    Slot: () => <View testID="tab-slot" />,
    usePathname: () => "/manager",
    useRouter: () => ({
      push: mockPush,
    }),
  };
});

jest.mock("@/components/themed-text", () => ({
  ThemedText: ({ children }: { children?: React.ReactNode }) => {
    const { Text } = require("react-native");
    return <Text>{children}</Text>;
  },
}));

jest.mock("@/components/themed-view", () => ({
  ThemedView: ({ children }: { children?: React.ReactNode }) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  },
}));

describe("AppTabs web", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the active route slot with marbles, history, and settings navigation buttons", async () => {
    const { getByTestId, getByText, queryByText } = await render(<AppTabs />);

    expect(getByTestId("tab-slot")).toBeTruthy();
    expect(getByText("Marbles")).toBeTruthy();
    expect(getByText("History")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
    // Admin and manager routes are not tab bar items
    expect(queryByText("Manager")).toBeNull();
  });

  it("navigates to history when the history button is pressed", async () => {
    const { getByText } = await render(<AppTabs />);
    getByText("History").props.onClick?.();
  });

  it("navigates to settings when the settings button is pressed", async () => {
    const { getByText } = await render(<AppTabs />);
    getByText("Settings").props.onClick?.();
  });
});
