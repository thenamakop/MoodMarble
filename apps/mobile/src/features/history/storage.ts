import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { z } from "zod";

import type { LocalMoodHistoryDayGroup, LocalMoodHistoryRecord } from "@/features/history/model";
import {
  groupLocalMoodHistoryByDay,
  LocalMoodHistoryRecordSchema,
  normalizeLocalMoodHistoryRecords,
} from "@/features/history/model";

const HISTORY_STORAGE_KEY = "moodmarble.local-mood-history";
const LocalMoodHistoryRecordsSchema = z.array(LocalMoodHistoryRecordSchema);

let webHistoryMemoryFallback: string | null = null;

export async function loadLocalMoodHistory(): Promise<LocalMoodHistoryRecord[]> {
  const storedValue = await readStoredHistory();

  if (!storedValue) {
    return [];
  }

  let decodedValue: unknown;

  try {
    decodedValue = JSON.parse(storedValue);
  } catch {
    await clearLocalMoodHistory();
    return [];
  }

  const parsedRecords = LocalMoodHistoryRecordsSchema.safeParse(decodedValue);

  if (!parsedRecords.success) {
    await clearLocalMoodHistory();
    return [];
  }

  return normalizeLocalMoodHistoryRecords(parsedRecords.data);
}

export async function saveLocalMoodHistory(
  records: LocalMoodHistoryRecord[],
): Promise<LocalMoodHistoryRecord[]> {
  const normalizedRecords = normalizeLocalMoodHistoryRecords(records);
  const serializedHistory = JSON.stringify(LocalMoodHistoryRecordsSchema.parse(normalizedRecords));
  const webStorage = getWebHistoryStorage();

  if (webStorage) {
    try {
      webStorage.setItem(HISTORY_STORAGE_KEY, serializedHistory);
      webHistoryMemoryFallback = serializedHistory;
      return normalizedRecords;
    } catch {
      webHistoryMemoryFallback = serializedHistory;
      return normalizedRecords;
    }
  }

  if (Platform.OS === "web") {
    webHistoryMemoryFallback = serializedHistory;
    return normalizedRecords;
  }

  try {
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, serializedHistory);
  } catch (error) {
    console.error("[MoodMarble] Failed to write mood history:", error);
  }
  return normalizedRecords;
}

export async function appendLocalMoodHistoryRecord(
  record: LocalMoodHistoryRecord,
): Promise<LocalMoodHistoryRecord[]> {
  const currentHistory = await loadLocalMoodHistory();
  const nextHistory = [...currentHistory, LocalMoodHistoryRecordSchema.parse(record)];

  return saveLocalMoodHistory(nextHistory);
}

export async function loadGroupedLocalMoodHistory(): Promise<LocalMoodHistoryDayGroup[]> {
  return groupLocalMoodHistoryByDay(await loadLocalMoodHistory());
}

export async function clearLocalMoodHistory(): Promise<void> {
  const webStorage = getWebHistoryStorage();

  if (webStorage) {
    try {
      webStorage.removeItem(HISTORY_STORAGE_KEY);
    } finally {
      webHistoryMemoryFallback = null;
    }
    return;
  }

  if (Platform.OS === "web") {
    webHistoryMemoryFallback = null;
    return;
  }

  await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
}

async function readStoredHistory(): Promise<string | null> {
  const webStorage = getWebHistoryStorage();

  if (webStorage) {
    try {
      return webStorage.getItem(HISTORY_STORAGE_KEY) ?? webHistoryMemoryFallback;
    } catch {
      return webHistoryMemoryFallback;
    }
  }

  if (Platform.OS === "web") {
    return webHistoryMemoryFallback;
  }

  return AsyncStorage.getItem(HISTORY_STORAGE_KEY);
}

function getWebHistoryStorage(): Storage | null {
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
