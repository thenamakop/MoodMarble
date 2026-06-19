import { render } from "@testing-library/react-native";
import { View } from "react-native";

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

import AppTabs from "@/components/app-tabs.web";

describe("AppTabs web", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the active route slot with a single visible marbles navigation button", async () => {
    const { getByTestId, getByText, queryByText } = await render(<AppTabs />);

    expect(getByTestId("tab-slot")).toBeTruthy();
    expect(getByText("Marbles")).toBeTruthy();
    expect(queryByText("History")).toBeNull();
    expect(queryByText("Manager")).toBeNull();
  });
});
