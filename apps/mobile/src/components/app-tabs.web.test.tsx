import { render } from "@testing-library/react-native";
import { View } from "react-native";

jest.mock("expo-router/ui", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    Tabs: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    TabSlot: () => <View testID="tab-slot" />,
    TabList: ({ children }: { children: React.ReactNode }) => (
      <View testID="tab-list">{children}</View>
    ),
    TabTrigger: jest.fn(({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    )),
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

const { TabTrigger } = jest.requireMock("expo-router/ui") as {
  TabTrigger: jest.Mock;
};

describe("AppTabs web", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("registers the marbles and history routes without adding a second visible tab", async () => {
    const { getByText, queryByText } = await render(<AppTabs />);

    expect(getByText("Marbles")).toBeTruthy();
    expect(queryByText("History")).toBeNull();
    expect(
      TabTrigger.mock.calls.map(([props]) => ({
        href: props.href,
        name: props.name,
      })),
    ).toEqual([
      { href: "/", name: "home" },
      { href: "/history", name: "history" },
    ]);
  });
});
