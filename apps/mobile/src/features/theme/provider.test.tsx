import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { ThemeProvider, useThemeContext } from "@/features/theme/provider";
import { loadThemePreference, saveThemePreference } from "@/features/theme/storage";

jest.mock("@/features/theme/storage", () => ({
  loadThemePreference: jest.fn(async () => "system"),
  saveThemePreference: jest.fn(async () => undefined),
}));

const mockLoadThemePreference = loadThemePreference as jest.Mock;
const mockSaveThemePreference = saveThemePreference as jest.Mock;

function TestConsumer() {
  const { themePreference, resolvedTheme, setThemePreference, isLoading } = useThemeContext();

  return (
    <>
      <Text testID="theme-preference">{themePreference}</Text>
      <Text testID="resolved-theme">{resolvedTheme}</Text>
      <Text testID="loading">{isLoading ? "loading" : "ready"}</Text>
      <Text
        testID="set-dark"
        onPress={() => {
          void setThemePreference("dark");
        }}
      >
        Set dark
      </Text>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadThemePreference.mockResolvedValue("system");
  });

  it("loads the persisted preference and exposes a resolved theme", async () => {
    mockLoadThemePreference.mockResolvedValue("dark");

    const view = await render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(view.getByTestId("loading")).toHaveTextContent("ready"));
    expect(view.getByTestId("theme-preference")).toHaveTextContent("dark");
    expect(view.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(mockLoadThemePreference).toHaveBeenCalledTimes(1);
  });

  it("resolves system preference to light when no system color scheme is available", async () => {
    mockLoadThemePreference.mockResolvedValue("system");

    const view = await render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(view.getByTestId("loading")).toHaveTextContent("ready"));
    expect(view.getByTestId("theme-preference")).toHaveTextContent("system");
    expect(view.getByTestId("resolved-theme")).toHaveTextContent("light");
  });

  it("saves the preference when the user changes it", async () => {
    const view = await render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(view.getByTestId("loading")).toHaveTextContent("ready"));

    await act(async () => {
      view.getByTestId("set-dark").props.onPress();
    });

    await waitFor(() => expect(mockSaveThemePreference).toHaveBeenCalledWith("dark"));
    expect(view.getByTestId("theme-preference")).toHaveTextContent("dark");
    expect(view.getByTestId("resolved-theme")).toHaveTextContent("dark");
  });

  it("falls back to system when the stored preference is invalid", async () => {
    mockLoadThemePreference.mockResolvedValue("invalid");

    const view = await render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(view.getByTestId("loading")).toHaveTextContent("ready"));
    expect(view.getByTestId("theme-preference")).toHaveTextContent("system");
  });
});
