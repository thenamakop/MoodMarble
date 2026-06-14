import * as SecureStore from "expo-secure-store";

import { AnonymousSessionSchema, type AnonymousSession } from "./types";

const SESSION_STORAGE_KEY = "moodmarble.anonymous-session";

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
    webStorage.setItem(SESSION_STORAGE_KEY, serializedSession);
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, serializedSession);
}

export async function clearAnonymousSession(): Promise<void> {
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    webStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

async function readStoredSession(): Promise<string | null> {
  const webStorage = getWebSessionStorage();

  if (webStorage) {
    return webStorage.getItem(SESSION_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(SESSION_STORAGE_KEY);
}

function getWebSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage ?? null;
}
