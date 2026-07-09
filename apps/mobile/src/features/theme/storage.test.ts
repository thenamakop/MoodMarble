import * as SecureStore from "expo-secure-store";

import { loadThemePreference, saveThemePreference } from "@/features/theme/storage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;

describe("theme storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the system preference when nothing is stored", async () => {
    mockGetItemAsync.mockResolvedValue(null);

    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("returns the stored preference when valid", async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify("dark"));

    await expect(loadThemePreference()).resolves.toBe("dark");
  });

  it("falls back to system when the stored value is invalid", async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify("hot-pink"));

    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("falls back to system when the stored value is not valid JSON", async () => {
    mockGetItemAsync.mockResolvedValue("not-json");

    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("persists the preference in SecureStore", async () => {
    await saveThemePreference("light");

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "moodmarble.theme-preference",
      JSON.stringify("light"),
    );
  });
});
