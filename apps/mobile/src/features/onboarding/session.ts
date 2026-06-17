import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { AnonymousSessionSchema, type AnonymousSession } from "./types";
import { isDeviceJwtActive } from "./device-jwt";

const SESSION_STORAGE_KEY = "moodmarble.anonymous-session";
let webSessionMemoryFallback: string | null = null;

export async function loadAnonymousSession(): Promise<AnonymousSession | null> {
  const storedValue = await readStoredSession();

  if (!storedValue) {
    return null;
  }

  let decodedValue: unknown;

  try {
    decodedValue = JSON.parse(storedValue);
  } catch {
    await clearAnonymousSession();
    return null;
  }

  const parsedSession = AnonymousSessionSchema.safeParse(decodedValue);

  if (!parsedSession.success) {
    await clearAnonymousSession();
    return null;
  }

  if (!isDeviceJwtActive(parsedSession.data.deviceJwt)) {
    await clearAnonymousSession();
    return null;
  }

  return parsedSession.data;
}

export async function saveAnonymousSession(
  session: AnonymousSession,
): Promise<void> {
  const serializedSession = JSON.stringify(
    AnonymousSessionSchema.parse(session),
  );
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    try {
      webStorage.setItem(SESSION_STORAGE_KEY, serializedSession);
      webSessionMemoryFallback = serializedSession;
      return;
    } catch {
      webSessionMemoryFallback = serializedSession;
      return;
    }
  }

  if (Platform.OS === "web") {
    webSessionMemoryFallback = serializedSession;
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, serializedSession);
}

export async function clearAnonymousSession(): Promise<void> {
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    try {
      webStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      webSessionMemoryFallback = null;
    }
    return;
  }

  if (Platform.OS === "web") {
    webSessionMemoryFallback = null;
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

async function readStoredSession(): Promise<string | null> {
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    try {
      return (
        webStorage.getItem(SESSION_STORAGE_KEY) ?? webSessionMemoryFallback
      );
    } catch {
      return webSessionMemoryFallback;
    }
  }

  if (Platform.OS === "web") {
    return webSessionMemoryFallback;
  }

  return SecureStore.getItemAsync(SESSION_STORAGE_KEY);
}

function getWebSessionStorage(): Storage | null {
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
