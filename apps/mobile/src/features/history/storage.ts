import * as SecureStore from "expo-secure-store";
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

/**
 * Loads the persisted local mood history records.
 *
 * Returns an empty array when no saved history exists or when the stored value cannot be parsed or validated. Corrupt
 * stored data is cleared before returning.
 *
 * @returns The normalized local mood history records.
 */
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

/**
 * Saves local mood history records.
 *
 * Persists the normalized records and updates the in-memory web fallback used when web storage is unavailable.
 *
 * @param records - Mood history records to save
 * @returns The normalized records that were persisted
 */
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
    await SecureStore.setItemAsync(HISTORY_STORAGE_KEY, serializedHistory);
  } catch (error) {
    console.error("[MoodMarble] Failed to write mood history:", error);
  }
  return normalizedRecords;
}

/**
 * Appends a mood history record and saves the updated history.
 *
 * @param record - The record to add to local mood history
 * @returns The saved mood history records
 */
export async function appendLocalMoodHistoryRecord(
  record: LocalMoodHistoryRecord,
): Promise<LocalMoodHistoryRecord[]> {
  const currentHistory = await loadLocalMoodHistory();
  const nextHistory = [...currentHistory, LocalMoodHistoryRecordSchema.parse(record)];

  return saveLocalMoodHistory(nextHistory);
}

/**
 * Groups the saved local mood history by day.
 *
 * @returns The mood history organized into day-based groups.
 */
export async function loadGroupedLocalMoodHistory(): Promise<LocalMoodHistoryDayGroup[]> {
  return groupLocalMoodHistoryByDay(await loadLocalMoodHistory());
}

/**
 * Clears the stored mood history.
 */
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

  await SecureStore.deleteItemAsync(HISTORY_STORAGE_KEY);
}

/**
 * Reads the persisted local mood history payload.
 *
 * @returns The stored history string, or `null` when no history is available.
 */
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

  return SecureStore.getItemAsync(HISTORY_STORAGE_KEY);
}

/**
 * Gets a usable browser storage object for local mood history.
 *
 * @returns The available `localStorage` or `sessionStorage` instance, or `null` if storage is unavailable.
 */
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
