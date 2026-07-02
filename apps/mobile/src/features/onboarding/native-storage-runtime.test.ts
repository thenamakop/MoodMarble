import type { TagValue } from "@/contracts/mood-submission";

describe("native onboarding storage runtime", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    jest.resetModules();
    jest.unmock("expo-crypto");
    jest.unmock("expo-secure-store");
    jest.unmock("react-native");

    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  it("uses SecureStore for anonymous sessions on native even when window exists", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });
    const secureStore = createSecureStoreMock({
      "moodmarble.anonymous-session": JSON.stringify({
        workspaceId: "ws_native",
        teamId: "tm_native",
        deviceJwt: activeDeviceJwt,
      }),
    });

    installWindowMock();
    mockNativeRuntime(secureStore);

    const { clearAnonymousSession, loadAnonymousSession, saveAnonymousSession } =
      require("./session") as typeof import("./session");

    await saveAnonymousSession({
      workspaceId: "ws_native",
      teamId: "tm_native",
      deviceJwt: activeDeviceJwt,
    });

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_native",
        teamId: "tm_native",
        deviceJwt: activeDeviceJwt,
      }),
    );
    expect(window.localStorage.getItem("moodmarble.anonymous-session")).toBeNull();

    await expect(loadAnonymousSession()).resolves.toEqual({
      workspaceId: "ws_native",
      teamId: "tm_native",
      deviceJwt: activeDeviceJwt,
    });

    await clearAnonymousSession();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("moodmarble.anonymous-session");
  });

  it("uses SecureStore for device tokens on native even when window exists", async () => {
    const secureStore = createSecureStoreMock();
    const randomUUID = jest.fn().mockReturnValue("550e8400-e29b-41d4-a716-446655440000");

    installWindowMock();
    mockNativeRuntime(secureStore, randomUUID);

    const { clearDeviceToken, getOrCreateDeviceToken } =
      require("./device-token") as typeof import("./device-token");

    await expect(getOrCreateDeviceToken()).resolves.toBe("550e8400-e29b-41d4-a716-446655440000");

    expect(secureStore.getItemAsync).toHaveBeenCalledWith("moodmarble.anonymous-device-token");
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "moodmarble.anonymous-device-token",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(window.sessionStorage.getItem("moodmarble.anonymous-device-token")).toBeNull();

    await clearDeviceToken();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("moodmarble.anonymous-device-token");
  });

  it("uses SecureStore (not localStorage) for local history on native even when window exists", async () => {
    const seedData = JSON.stringify([
      createHistoryRecord({
        id: "history-native",
        mood_type: "calm",
        submission_date: "2026-06-17",
        recorded_at: "2026-06-17T09:00:00.000Z",
      }),
    ]);
    const secureStore = createSecureStoreMock({
      "moodmarble.local-mood-history": seedData,
    });

    installWindowMock();
    mockNativeRuntime(secureStore);

    const { appendLocalMoodHistoryRecord, clearLocalMoodHistory, loadLocalMoodHistory } =
      require("../history/storage") as typeof import("../history/storage");

    await appendLocalMoodHistoryRecord(
      createHistoryRecord({
        id: "history-next",
        mood_type: "focused",
        submission_date: "2026-06-17",
        recorded_at: "2026-06-17T10:00:00.000Z",
      }),
    );

    expect(secureStore.getItemAsync).toHaveBeenCalledWith("moodmarble.local-mood-history");
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "moodmarble.local-mood-history",
      expect.any(String),
    );
    expect(window.localStorage.getItem("moodmarble.local-mood-history")).toBeNull();

    await expect(loadLocalMoodHistory()).resolves.toEqual([
      createHistoryRecord({
        id: "history-next",
        mood_type: "focused",
        submission_date: "2026-06-17",
        recorded_at: "2026-06-17T10:00:00.000Z",
      }),
      createHistoryRecord({
        id: "history-native",
        mood_type: "calm",
        submission_date: "2026-06-17",
        recorded_at: "2026-06-17T09:00:00.000Z",
      }),
    ]);

    await clearLocalMoodHistory();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("moodmarble.local-mood-history");
  });
});

function mockNativeRuntime(
  secureStore: ReturnType<typeof createSecureStoreMock>,
  randomUUID = jest.fn(),
) {
  jest.doMock("react-native", () => ({
    Platform: {
      OS: "android",
    },
  }));
  jest.doMock("expo-secure-store", () => secureStore);
  jest.doMock("expo-crypto", () => ({
    randomUUID,
  }));
}

function createSecureStoreMock(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));

  return {
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

function installWindowMock() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: createStorageMock(),
      sessionStorage: createStorageMock(),
    },
  });
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

function createHistoryRecord(
  overrides: Partial<{
    id: string;
    mood_type: "happy" | "calm" | "focused" | "stressed" | "energised";
    submission_date: string;
    recorded_at: string;
    hour_of_day: number;
    tags: TagValue[];
  }> = {},
) {
  return {
    id: overrides.id ?? "history-default",
    mood_type: overrides.mood_type ?? ("happy" as const),
    tags: overrides.tags ?? (["#team"] as TagValue[]),
    hour_of_day: overrides.hour_of_day ?? 8,
    submission_date: overrides.submission_date ?? "2026-06-17",
    recorded_at: overrides.recorded_at ?? "2026-06-17T08:00:00.000Z",
  };
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
