import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import {
  clearOnboardingReplayRequest,
  createDefaultLocalSettings,
  parseLocalSettings,
  requestOnboardingReplay,
  type LocalSettings,
} from "./model";

const LOCAL_SETTINGS_STORAGE_KEY = "moodmarble.local-settings";
let webLocalSettingsMemoryFallback: string | null = null;

export async function loadLocalSettings(): Promise<LocalSettings> {
  const storedValue = await readStoredLocalSettings();

  if (!storedValue) {
    return createDefaultLocalSettings();
  }

  let decodedValue: unknown;

  try {
    decodedValue = JSON.parse(storedValue);
  } catch {
    await clearLocalSettings();
    return createDefaultLocalSettings();
  }

  try {
    return parseLocalSettings(decodedValue);
  } catch {
    await clearLocalSettings();
    return createDefaultLocalSettings();
  }
}

export async function saveLocalSettings(settings: LocalSettings): Promise<LocalSettings> {
  const normalizedSettings = parseLocalSettings(settings);
  const serializedSettings = JSON.stringify(normalizedSettings);
  const webStorage = getWebLocalSettingsStorage();

  if (webStorage) {
    try {
      webStorage.setItem(LOCAL_SETTINGS_STORAGE_KEY, serializedSettings);
      webLocalSettingsMemoryFallback = serializedSettings;
      return normalizedSettings;
    } catch {
      webLocalSettingsMemoryFallback = serializedSettings;
      return normalizedSettings;
    }
  }

  if (Platform.OS === "web") {
    webLocalSettingsMemoryFallback = serializedSettings;
    return normalizedSettings;
  }

  await AsyncStorage.setItem(LOCAL_SETTINGS_STORAGE_KEY, serializedSettings);
  return normalizedSettings;
}

export async function requestStoredOnboardingReplay(): Promise<LocalSettings> {
  return saveLocalSettings(requestOnboardingReplay(await loadLocalSettings()));
}

export async function clearStoredOnboardingReplayRequest(): Promise<LocalSettings> {
  return saveLocalSettings(clearOnboardingReplayRequest(await loadLocalSettings()));
}

export async function clearLocalSettings(): Promise<void> {
  const webStorage = getWebLocalSettingsStorage();

  if (webStorage) {
    try {
      webStorage.removeItem(LOCAL_SETTINGS_STORAGE_KEY);
    } finally {
      webLocalSettingsMemoryFallback = null;
    }
    return;
  }

  if (Platform.OS === "web") {
    webLocalSettingsMemoryFallback = null;
    return;
  }

  await AsyncStorage.removeItem(LOCAL_SETTINGS_STORAGE_KEY);
}

async function readStoredLocalSettings(): Promise<string | null> {
  const webStorage = getWebLocalSettingsStorage();

  if (webStorage) {
    try {
      return webStorage.getItem(LOCAL_SETTINGS_STORAGE_KEY) ?? webLocalSettingsMemoryFallback;
    } catch {
      return webLocalSettingsMemoryFallback;
    }
  }

  if (Platform.OS === "web") {
    return webLocalSettingsMemoryFallback;
  }

  return AsyncStorage.getItem(LOCAL_SETTINGS_STORAGE_KEY);
}

function getWebLocalSettingsStorage(): Storage | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  const localStorage = tryReadWebStorage("localStorage");

  if (localStorage) {
    return localStorage;
  }

  return tryReadWebStorage("sessionStorage");
}

function tryReadWebStorage(storageKey: "localStorage" | "sessionStorage") {
  try {
    const storage = window[storageKey];

    if (
      storage &&
      typeof storage.getItem === "function" &&
      typeof storage.setItem === "function" &&
      typeof storage.removeItem === "function"
    ) {
      return storage;
    }

    return null;
  } catch {
    return null;
  }
}
