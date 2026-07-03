import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from "./model";

const THEME_PREFERENCE_STORAGE_KEY = "moodmarble.theme-preference";

/**
 * Loads the persisted theme preference.
 *
 * Returns the default preference when no value is stored or when the stored
 * value is not a valid theme preference.
 */
export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const storedValue = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);

    if (storedValue === null) {
      return DEFAULT_THEME_PREFERENCE;
    }

    const parsedValue = JSON.parse(storedValue);

    if (isValidThemePreference(parsedValue)) {
      return parsedValue;
    }
  } catch {
    // Ignore parse/storage errors and fall back to the default preference.
  }

  return DEFAULT_THEME_PREFERENCE;
}

/**
 * Persists the theme preference.
 */
export async function saveThemePreference(themePreference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, JSON.stringify(themePreference));
}

function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
