import {
  clearAnonymousSession,
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";

describe("anonymous session storage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("saves the anonymous session through the current storage backend", async () => {
    await saveAnonymousSession({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: "device-jwt-token",
    });

    expect(window.sessionStorage.getItem("moodmarble.anonymous-session")).toBe(
      JSON.stringify({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: "device-jwt-token",
      }),
    );
  });

  it("loads a stored anonymous session", async () => {
    window.sessionStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: "device-jwt-token",
      }),
    );

    await expect(loadAnonymousSession()).resolves.toEqual({
      workspaceId: "ws_test",
      teamId: "tm_product",
      deviceJwt: "device-jwt-token",
    });
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

  it("clears the stored anonymous session on sign-out cleanup", async () => {
    window.sessionStorage.setItem("moodmarble.anonymous-session", "{}");

    await clearAnonymousSession();

    expect(
      window.sessionStorage.getItem("moodmarble.anonymous-session"),
    ).toBeNull();
  });

  it("falls back when web sessionStorage access is unavailable", async () => {
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
        deviceJwt: "device-jwt-token",
      });

      await expect(loadAnonymousSession()).resolves.toEqual({
        workspaceId: "ws_test",
        teamId: "tm_product",
        deviceJwt: "device-jwt-token",
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
});
