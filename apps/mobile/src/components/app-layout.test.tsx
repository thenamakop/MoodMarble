import { render } from "@testing-library/react-native";
import { Linking } from "react-native";

import TabLayout from "@/app/_layout";

const mockSlot = jest.fn(() => <></>);
const mockAppTabs = jest.fn(() => <></>);
const mockReplace = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock("@react-navigation/native", () => ({
  DarkTheme: { dark: true },
  DefaultTheme: { dark: false },
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-router", () => ({
  Slot: () => mockSlot(),
  usePathname: jest.fn(),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("@/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
}));

jest.mock("@/components/app-tabs", () => () => mockAppTabs());
jest.mock("@/app/+native-intent", () => ({
  resolveSystemHref: jest.fn((path: string) => path),
}));

const { usePathname } = jest.requireMock("expo-router") as {
  usePathname: jest.Mock;
};
const { resolveSystemHref } = jest.requireMock("@/app/+native-intent") as {
  resolveSystemHref: jest.Mock;
};

describe("TabLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEventListener.mockReturnValue({
      remove: jest.fn(),
    });
  });

  it("renders the standard tab shell for member routes", async () => {
    usePathname.mockReturnValue("/");

    await render(<TabLayout />);

    expect(mockAppTabs).toHaveBeenCalled();
    expect(mockSlot).not.toHaveBeenCalled();
  });

  it("bypasses the tab shell for manager routes", async () => {
    usePathname.mockReturnValue("/manager");

    await render(<TabLayout />);

    expect(mockSlot).toHaveBeenCalled();
    expect(mockAppTabs).not.toHaveBeenCalled();
  });

  it("bypasses the tab shell for admin routes", async () => {
    usePathname.mockReturnValue("/admin");

    await render(<TabLayout />);

    expect(mockSlot).toHaveBeenCalled();
    expect(mockAppTabs).not.toHaveBeenCalled();
  });

  it("rewrites incoming system URLs through the router while the app is open", async () => {
    usePathname.mockReturnValue("/");
    resolveSystemHref.mockReturnValue("/manager?team_id=tm_product");

    await render(<TabLayout />);

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "url",
      expect.any(Function),
    );

    const listener = mockAddEventListener.mock.calls[0]?.[1];
    listener?.({ url: "moodmarble://manager?team_id=tm_product" });

    expect(resolveSystemHref).toHaveBeenCalledWith(
      "moodmarble://manager?team_id=tm_product",
    );
    expect(mockReplace).toHaveBeenCalledWith("/manager?team_id=tm_product");
  });
});

jest
  .spyOn(Linking, "addEventListener")
  .mockImplementation(mockAddEventListener);
