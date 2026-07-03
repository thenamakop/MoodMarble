import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadThemePreference, saveThemePreference } from "@/features/theme/storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => undefined),
}));

const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;

describe("theme storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the system preference when nothing is stored", async () => {
    mockGetItem.mockResolvedValue(null);

    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("returns the stored preference when valid", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify("dark"));

    await expect(loadThemePreference()).resolves.toBe("dark");
  });

  it("falls back to system when the stored value is invalid", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify("hot-pink"));

    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("falls back to system when the stored value is not valid JSON", async () => {
    mockGetItem.mockResolvedValue("not-json");

    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("persists the preference in AsyncStorage", async () => {
    await saveThemePreference("light");

    expect(mockSetItem).toHaveBeenCalledWith(
      "moodmarble.theme-preference",
      JSON.stringify("light"),
    );
  });
});
