import { render } from "@testing-library/react-native";
import { Text, View } from "react-native";

jest.mock("expo-router/unstable-native-tabs", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  const mockTrigger = jest.fn(
    ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  );

  const NativeTabs = ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );

  NativeTabs.Trigger = Object.assign(mockTrigger, {
    Icon: () => null,
    Label: ({ children }: { children?: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
  });

  return { NativeTabs, __mockTrigger: mockTrigger };
});

import AppTabs from "@/components/app-tabs";

const { __mockTrigger } = jest.requireMock(
  "expo-router/unstable-native-tabs",
) as {
  __mockTrigger: jest.Mock;
};

describe("AppTabs native", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the marbles tab visible and registers the history route as hidden", async () => {
    const { getByText } = await render(<AppTabs />);

    expect(getByText("Marbles")).toBeTruthy();
    expect(
      __mockTrigger.mock.calls.map(([props]) => ({
        hidden: props.hidden ?? false,
        name: props.name,
      })),
    ).toEqual([
      { hidden: false, name: "index" },
      { hidden: true, name: "history" },
      { hidden: true, name: "manager" },
    ]);
  });
});
