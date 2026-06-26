import { render } from "@testing-library/react-native";

import RootLayout from "@/app/_layout";

const mockScreen = jest.fn(() => null);
const mockStack = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));
(mockStack as unknown as { Screen: jest.Mock }).Screen = mockScreen;

jest.mock("@react-navigation/native", () => ({
  DarkTheme: { dark: true },
  DefaultTheme: { dark: false },
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-router", () => ({
  Stack: Object.assign(
    jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
    { Screen: jest.fn(() => null) },
  ),
}));

jest.mock("@/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
}));

describe("RootLayout", () => {
  it("renders without crashing", async () => {
    await expect(render(<RootLayout />)).toBeTruthy();
  });
});
