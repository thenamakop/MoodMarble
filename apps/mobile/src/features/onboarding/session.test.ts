import * as SecureStore from "expo-secure-store";

import {
  clearAnonymousSession,
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";

describe("anonymous session storage", () => {
  const originalWindow = globalThis.window;

  afterEach(async () => {
    if (typeof window !== "undefined") {
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

    expect(window.sessionStorage.getItem("moodmarble.anonymous-session")).toBe(
      JSON.stringify({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: activeDeviceJwt,
      }),
    );
  });

  it("loads a stored anonymous session", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    window.sessionStorage.setItem(
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
    window.sessionStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_test",
      }),
    );

    await expect(loadAnonymousSession()).resolves.toBeNull();
    expect(
      window.sessionStorage.getItem("moodmarble.anonymous-session"),
    ).toBeNull();
  });

  it("clears an expired stored anonymous session", async () => {
    window.sessionStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: createDeviceJwt({ exp: pastExp() }),
      }),
    );

    await expect(loadAnonymousSession()).resolves.toBeNull();
    expect(
      window.sessionStorage.getItem("moodmarble.anonymous-session"),
    ).toBeNull();
  });

  it("clears the stored anonymous session on sign-out cleanup", async () => {
    window.sessionStorage.setItem("moodmarble.anonymous-session", "{}");

    await clearAnonymousSession();

    expect(
      window.sessionStorage.getItem("moodmarble.anonymous-session"),
    ).toBeNull();
  });

  it("falls back when web sessionStorage access is unavailable", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });
    const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "sessionStorage",
    );

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("sessionStorage blocked");
      },
    });

    try {
      await saveAnonymousSession({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: activeDeviceJwt,
      });

      await expect(loadAnonymousSession()).resolves.toEqual({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: activeDeviceJwt,
      });

      await clearAnonymousSession();
      await expect(loadAnonymousSession()).resolves.toBeNull();
    } finally {
      if (sessionStorageDescriptor) {
        Object.defineProperty(
          window,
          "sessionStorage",
          sessionStorageDescriptor,
        );
      }
    }
  });

  it("uses secure storage read and write when the app storage path is native", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });
    const setItemAsync = jest
      .spyOn(SecureStore, "setItemAsync")
      .mockResolvedValue(undefined);
    const getItemAsync = jest
      .spyOn(SecureStore, "getItemAsync")
      .mockResolvedValue(
        JSON.stringify({
          workspaceId: "ws_native",
          teamId: "tm_native",
          deviceJwt: activeDeviceJwt,
        }),
      );
    const deleteItemAsync = jest
      .spyOn(SecureStore, "deleteItemAsync")
      .mockResolvedValue(undefined);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    });

    await saveAnonymousSession({
      workspaceId: "ws_native",
      teamId: "tm_native",
      deviceJwt: activeDeviceJwt,
    });

    expect(setItemAsync).toHaveBeenCalledWith(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_native",
        teamId: "tm_native",
        deviceJwt: activeDeviceJwt,
      }),
    );

    await expect(loadAnonymousSession()).resolves.toEqual({
      workspaceId: "ws_native",
      teamId: "tm_native",
      deviceJwt: activeDeviceJwt,
    });

    await clearAnonymousSession();
    expect(deleteItemAsync).toHaveBeenCalledWith(
      "moodmarble.anonymous-session",
    );
    expect(getItemAsync).toHaveBeenCalledWith("moodmarble.anonymous-session");
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
