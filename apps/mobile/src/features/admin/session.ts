import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { z } from "zod";

import type { AdminWorkspaceSession } from "./api";

const AdminSessionSchema = z.object({
  adminJwt: z.string().min(1),
  workspaceId: z.string().min(1),
  workspaceName: z.string().nullable().optional(),
});

export type AdminSession = z.infer<typeof AdminSessionSchema>;

const ADMIN_SESSION_STORAGE_KEY = "moodmarble.admin-session";
let webAdminSessionMemoryFallback: string | null = null;

export async function loadAdminSession(): Promise<AdminSession | null> {
  const storedValue = await readStoredAdminSession();

  if (!storedValue) {
    return null;
  }

  let decodedValue: unknown;

  try {
    decodedValue = JSON.parse(storedValue);
  } catch {
    await clearAdminSession();
    return null;
  }

  const parsedSession = AdminSessionSchema.safeParse(decodedValue);

  if (!parsedSession.success) {
    await clearAdminSession();
    return null;
  }

  return parsedSession.data;
}

export async function saveAdminSession(session: AdminSession): Promise<void> {
  const serializedSession = JSON.stringify(AdminSessionSchema.parse(session));
  const webStorage = getWebAdminSessionStorage();

  if (webStorage) {
    try {
      webStorage.setItem(ADMIN_SESSION_STORAGE_KEY, serializedSession);
      webAdminSessionMemoryFallback = serializedSession;
      return;
    } catch {
      webAdminSessionMemoryFallback = serializedSession;
      return;
    }
  }

  if (Platform.OS === "web") {
    webAdminSessionMemoryFallback = serializedSession;
    return;
  }

  await SecureStore.setItemAsync(ADMIN_SESSION_STORAGE_KEY, serializedSession);
}

export async function clearAdminSession(): Promise<void> {
  const webStorage = getWebAdminSessionStorage();

  if (webStorage) {
    try {
      webStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } finally {
      webAdminSessionMemoryFallback = null;
    }
    return;
  }

  if (Platform.OS === "web") {
    webAdminSessionMemoryFallback = null;
    return;
  }

  await SecureStore.deleteItemAsync(ADMIN_SESSION_STORAGE_KEY);
}

async function readStoredAdminSession(): Promise<string | null> {
  const webStorage = getWebAdminSessionStorage();

  if (webStorage) {
    try {
      return (
        webStorage.getItem(ADMIN_SESSION_STORAGE_KEY) ??
        webAdminSessionMemoryFallback
      );
    } catch {
      return webAdminSessionMemoryFallback;
    }
  }

  if (Platform.OS === "web") {
    return webAdminSessionMemoryFallback;
  }

  return SecureStore.getItemAsync(ADMIN_SESSION_STORAGE_KEY);
}

function getWebAdminSessionStorage(): Storage | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  const localStorage = tryReadWebAdminStorage("localStorage");

  if (localStorage) {
    return localStorage;
  }

  return tryReadWebAdminStorage("sessionStorage");
}

function tryReadWebAdminStorage(storageKey: "localStorage" | "sessionStorage") {
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
