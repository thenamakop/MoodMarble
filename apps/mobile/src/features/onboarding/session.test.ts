import {
  clearAnonymousSession,
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";
import { installLocalStorageMock, installSessionStorageMock } from "@/test-utils/web-storage-mock";

jest.mock("react-native", () => ({
  Platform: {
    OS: "web",
  },
}));

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe("anonymous session storage", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    installLocalStorageMock();
    installSessionStorageMock();
  });

  afterEach(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }

    await clearAnonymousSession();
    jest.restoreAllMocks();

    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("saves the anonymous session through the current storage backend", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    await saveAnonymousSession({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });

    expect(window.localStorage.getItem("moodmarble.anonymous-session")).toBe(
      JSON.stringify({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: activeDeviceJwt,
      }),
    );
  });

  it("loads a stored anonymous session", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    window.localStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: activeDeviceJwt,
      }),
    );

    await expect(loadAnonymousSession()).resolves.toEqual({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
  });

  it("returns null on first launch when no stored session exists", async () => {
    await expect(loadAnonymousSession()).resolves.toBeNull();
  });

  it("clears an invalid stored anonymous session", async () => {
    window.localStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_test",
      }),
    );

    await expect(loadAnonymousSession()).resolves.toBeNull();
    expect(window.localStorage.getItem("moodmarble.anonymous-session")).toBeNull();
  });

  it("clears an expired stored anonymous session", async () => {
    window.localStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: createDeviceJwt({ exp: pastExp() }),
      }),
    );

    await expect(loadAnonymousSession()).resolves.toBeNull();
    expect(window.localStorage.getItem("moodmarble.anonymous-session")).toBeNull();
  });

  it("clears the stored anonymous session on sign-out cleanup", async () => {
    window.localStorage.setItem("moodmarble.anonymous-session", "{}");

    await clearAnonymousSession();

    expect(window.localStorage.getItem("moodmarble.anonymous-session")).toBeNull();
  });

  it("falls back to sessionStorage when localStorage access is unavailable", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("localStorage blocked");
      },
    });

    try {
      await saveAnonymousSession({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: activeDeviceJwt,
      });

      expect(window.sessionStorage.getItem("moodmarble.anonymous-session")).toBe(
        JSON.stringify({
          workspaceId: "ws_test",
          teamId: "tm_product",
          deviceJwt: activeDeviceJwt,
        }),
      );

      await expect(loadAnonymousSession()).resolves.toEqual({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: activeDeviceJwt,
      });

      await clearAnonymousSession();
      await expect(loadAnonymousSession()).resolves.toBeNull();
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, "localStorage", localStorageDescriptor);
      }
    }
  });
});

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

function pastExp(): number {
  return Math.floor(Date.now() / 1000) - 60;
}
