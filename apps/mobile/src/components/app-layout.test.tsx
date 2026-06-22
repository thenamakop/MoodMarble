import { render } from "@testing-library/react-native";

import TabLayout from "@/app/_layout";

const mockSlot = jest.fn(() => <></>);
const mockAppTabs = jest.fn(() => <></>);

jest.mock("@react-navigation/native", () => ({
  DarkTheme: { dark: true },
  DefaultTheme: { dark: false },
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-router", () => ({
  Slot: () => mockSlot(),
  usePathname: jest.fn(),
}));

jest.mock("@/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
}));

jest.mock("@/components/app-tabs", () => () => mockAppTabs());

const { usePathname } = jest.requireMock("expo-router") as {
  usePathname: jest.Mock;
};

describe("TabLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the standard tab shell for member and manager routes", async () => {
    usePathname.mockReturnValue("/");

    await render(<TabLayout />);

    expect(mockAppTabs).toHaveBeenCalled();
    expect(mockSlot).not.toHaveBeenCalled();
  });

  it("bypasses the tab shell for admin routes", async () => {
    usePathname.mockReturnValue("/admin");

    await render(<TabLayout />);

    expect(mockSlot).toHaveBeenCalled();
    expect(mockAppTabs).not.toHaveBeenCalled();
  });
});
