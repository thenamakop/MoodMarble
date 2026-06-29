jest.mock("react-native", () => ({
  Platform: {
    OS: "web",
  },
}));

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: "default",
  },
  AndroidNotificationVisibility: {
    PUBLIC: "public",
  },
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => "scheduled-id"),
  setNotificationChannelAsync: jest.fn(async () => undefined),
}));

import {
  clearAnonymousSession,
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";
import {
  appendLocalMoodHistoryRecord,
  clearLocalMoodHistory,
  loadLocalMoodHistory,
} from "@/features/history/storage";
import {
  clearLocalSettings,
  clearStoredOnboardingReplayRequest,
  loadLocalSettings,
  requestStoredOnboardingReplay,
  saveLocalSettings,
} from "@/features/settings/storage";
import { clearLocalDeviceData } from "@/features/settings/local-data";

describe("local settings storage", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    installStorageMocks();
  });

  afterEach(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }

    await clearAnonymousSession();
    await clearLocalMoodHistory();
    await clearLocalSettings();
    jest.restoreAllMocks();
    jest.resetModules();

    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("loads default local settings on first launch", async () => {
    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: false,
    });
  });

  it("saves and loads normalized local settings through web storage", async () => {
    await saveLocalSettings({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["20:00", "09:00", "20:00"],
      replayOnboarding: false,
    });

    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:00", "20:00"],
      replayOnboarding: false,
    });
  });

  it("persists onboarding replay requests locally until they are cleared", async () => {
    await requestStoredOnboardingReplay();

    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: true,
    });

    await clearStoredOnboardingReplayRequest();

    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: false,
    });
  });

  it("replays onboarding without clearing the existing anonymous session or local history", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    await saveAnonymousSession({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
    await appendLocalMoodHistoryRecord(
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    );

    await requestStoredOnboardingReplay();

    await expect(loadAnonymousSession()).resolves.toEqual({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
    await expect(loadLocalMoodHistory()).resolves.toEqual([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    ]);
    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: true,
    });
  });

  it("clears invalid stored settings and falls back to defaults", async () => {
    window.localStorage.setItem("moodmarble.local-settings", "{not-json");

    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: false,
    });

    expect(window.localStorage.getItem("moodmarble.local-settings")).toBeNull();
  });

  it("clears only local settings and leaves session and history intact", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    await saveAnonymousSession({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
    await appendLocalMoodHistoryRecord(
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    );
    await saveLocalSettings({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:00"],
      replayOnboarding: true,
    });

    await clearLocalSettings();

    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: false,
    });
    await expect(loadAnonymousSession()).resolves.toEqual({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
    await expect(loadLocalMoodHistory()).resolves.toEqual([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    ]);
  });

  it("clears all device-local state and returns to a safe post-clear baseline", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    await saveAnonymousSession({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
    await appendLocalMoodHistoryRecord(
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    );
    await saveLocalSettings({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: true,
    });

    await clearLocalDeviceData({
      cancelReminderNotifications: jest.fn(async () => undefined),
    });

    await expect(loadAnonymousSession()).resolves.toBeNull();
    await expect(loadLocalMoodHistory()).resolves.toEqual([]);
    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: false,
    });
  });
});

function createHistoryRecord(
  overrides: Partial<{
    id: string;
    mood_type: "happy" | "calm" | "focused" | "stressed" | "energised";
    submission_date: string;
    recorded_at: string;
    hour_of_day: number;
    tags: string[];
  }> = {},
) {
  return {
    id: overrides.id ?? "history-default",
    mood_type: overrides.mood_type ?? "happy",
    tags: overrides.tags ?? ["#team"],
    hour_of_day: overrides.hour_of_day ?? 8,
    submission_date: overrides.submission_date ?? "2026-06-15",
    recorded_at: overrides.recorded_at ?? "2026-06-15T08:00:00.000Z",
  };
}

function installStorageMocks() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createStorageMock(),
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: createStorageMock(),
  });
}

function createStorageMock(): Storage {
  const storageMap = new Map<string, string>();

  return {
    get length() {
      return storageMap.size;
    },
    clear() {
      storageMap.clear();
    },
    getItem(key: string) {
      return storageMap.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storageMap.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storageMap.delete(key);
    },
    setItem(key: string, value: string) {
      storageMap.set(key, value);
    },
  };
}

function createDeviceJwt(payload: { exp: number }): string {
  return [
    encodeJsonSegment({ alg: "none", typ: "JWT" }),
    encodeJsonSegment(payload),
    "signature",
  ].join(".");
}

function encodeJsonSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 60 * 60;
}
