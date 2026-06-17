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

import {
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";
import {
  appendLocalMoodHistoryRecord,
  clearLocalMoodHistory,
  loadGroupedLocalMoodHistory,
  loadLocalMoodHistory,
  saveLocalMoodHistory,
} from "@/features/history/storage";

describe("local mood history storage", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    installStorageMocks();
  });

  afterEach(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }

    await clearLocalMoodHistory();
    jest.restoreAllMocks();
    jest.resetModules();

    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("saves and loads full local history through web storage", async () => {
    await saveLocalMoodHistory([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
      createHistoryRecord({
        id: "history-2",
        mood_type: "calm",
        submission_date: "2026-06-14",
        recorded_at: "2026-06-14T09:00:00.000Z",
      }),
    ]);

    await expect(loadLocalMoodHistory()).resolves.toEqual([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
      createHistoryRecord({
        id: "history-2",
        mood_type: "calm",
        submission_date: "2026-06-14",
        recorded_at: "2026-06-14T09:00:00.000Z",
      }),
    ]);
  });

  it("appends a record and keeps history sorted newest-first", async () => {
    await saveLocalMoodHistory([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-14",
        recorded_at: "2026-06-14T09:00:00.000Z",
      }),
    ]);

    await appendLocalMoodHistoryRecord(
      createHistoryRecord({
        id: "history-2",
        mood_type: "focused",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T18:00:00.000Z",
      }),
    );

    await expect(loadLocalMoodHistory()).resolves.toEqual([
      createHistoryRecord({
        id: "history-2",
        mood_type: "focused",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T18:00:00.000Z",
      }),
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-14",
        recorded_at: "2026-06-14T09:00:00.000Z",
      }),
    ]);
  });

  it("loads grouped local history by local submission day", async () => {
    await saveLocalMoodHistory([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T12:00:00.000Z",
      }),
      createHistoryRecord({
        id: "history-2",
        mood_type: "calm",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
      createHistoryRecord({
        id: "history-3",
        mood_type: "stressed",
        submission_date: "2026-06-14",
        recorded_at: "2026-06-14T18:30:00.000Z",
      }),
    ]);

    await expect(loadGroupedLocalMoodHistory()).resolves.toEqual([
      {
        submission_date: "2026-06-15",
        records: [
          createHistoryRecord({
            id: "history-1",
            mood_type: "happy",
            submission_date: "2026-06-15",
            recorded_at: "2026-06-15T12:00:00.000Z",
          }),
          createHistoryRecord({
            id: "history-2",
            mood_type: "calm",
            submission_date: "2026-06-15",
            recorded_at: "2026-06-15T08:00:00.000Z",
          }),
        ],
      },
      {
        submission_date: "2026-06-14",
        records: [
          createHistoryRecord({
            id: "history-3",
            mood_type: "stressed",
            submission_date: "2026-06-14",
            recorded_at: "2026-06-14T18:30:00.000Z",
          }),
        ],
      },
    ]);
  });

  it("clears stored local history", async () => {
    await saveLocalMoodHistory([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    ]);

    await clearLocalMoodHistory();

    await expect(loadLocalMoodHistory()).resolves.toEqual([]);
  });

  it("clears only local history and leaves the anonymous session intact", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    await saveAnonymousSession({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
    await saveLocalMoodHistory([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    ]);

    await clearLocalMoodHistory();

    await expect(loadLocalMoodHistory()).resolves.toEqual([]);
    await expect(loadAnonymousSession()).resolves.toEqual({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
  });

  it("safely starts a fresh local history after clearing", async () => {
    await saveLocalMoodHistory([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    ]);

    await clearLocalMoodHistory();
    await appendLocalMoodHistoryRecord(
      createHistoryRecord({
        id: "history-2",
        mood_type: "focused",
        submission_date: "2026-06-16",
        recorded_at: "2026-06-16T09:00:00.000Z",
      }),
    );

    await expect(loadLocalMoodHistory()).resolves.toEqual([
      createHistoryRecord({
        id: "history-2",
        mood_type: "focused",
        submission_date: "2026-06-16",
        recorded_at: "2026-06-16T09:00:00.000Z",
      }),
    ]);
  });

  it("persists local history across module reloads", async () => {
    await saveLocalMoodHistory([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    ]);

    jest.resetModules();

    const reloadedStorage = jest.requireActual(
      "@/features/history/storage",
    ) as typeof import("@/features/history/storage");

    await expect(reloadedStorage.loadLocalMoodHistory()).resolves.toEqual([
      createHistoryRecord({
        id: "history-1",
        mood_type: "happy",
        submission_date: "2026-06-15",
        recorded_at: "2026-06-15T08:00:00.000Z",
      }),
    ]);
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
