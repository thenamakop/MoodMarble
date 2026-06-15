import {
  clearAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";
import {
  getAnonymousSessionFromParams,
  restoreAnonymousSession,
} from "@/features/onboarding/session-boundary";

describe("anonymous session route boundary", () => {
  afterEach(async () => {
    await clearAnonymousSession();
  });

  it("reads a valid anonymous session bootstrap from route params", () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    expect(
      getAnonymousSessionFromParams({
        workspace_id: "ws_localdemo",
        team_id: "tm_product",
        device_jwt: activeDeviceJwt,
      }),
    ).toEqual({
      workspaceId: "ws_localdemo",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
  });

  it("ignores incomplete route params", () => {
    expect(
      getAnonymousSessionFromParams({
        workspace_id: "ws_localdemo",
        team_id: "tm_product",
      }),
    ).toBeNull();
  });

  it("ignores expired route params and falls back to onboarding", () => {
    expect(
      getAnonymousSessionFromParams({
        workspace_id: "ws_localdemo",
        team_id: "tm_product",
        device_jwt: createDeviceJwt({ exp: pastExp() }),
      }),
    ).toBeNull();
  });

  it("persists a valid bootstrap session before handing it to the app", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    await expect(
      restoreAnonymousSession({
        workspace_id: "ws_localdemo",
        team_id: "tm_product",
        device_jwt: activeDeviceJwt,
      }),
    ).resolves.toEqual({
      workspaceId: "ws_localdemo",
      teamId: "tm_product",
      deviceJwt: activeDeviceJwt,
    });
  });

  it("falls back to onboarding on first launch when no stored session exists", async () => {
    await expect(restoreAnonymousSession({})).resolves.toBeNull();
  });

  it("recovers the stored anonymous session after restart", async () => {
    const activeDeviceJwt = createDeviceJwt({ exp: futureExp() });

    await saveAnonymousSession({
      workspaceId: "ws_existing",
      teamId: "tm_engineering",
      deviceJwt: activeDeviceJwt,
    });

    await expect(restoreAnonymousSession({})).resolves.toEqual({
      workspaceId: "ws_existing",
      teamId: "tm_engineering",
      deviceJwt: activeDeviceJwt,
    });
  });

  it("falls back to onboarding when the stored session token is missing", async () => {
    window.sessionStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_existing",
        teamId: "tm_engineering",
      }),
    );

    await expect(restoreAnonymousSession({})).resolves.toBeNull();
  });

  it("falls back to onboarding when the stored session token has expired", async () => {
    await saveAnonymousSession({
      workspaceId: "ws_existing",
      teamId: "tm_engineering",
      deviceJwt: createDeviceJwt({ exp: pastExp() + 120 }),
    });

    window.sessionStorage.setItem(
      "moodmarble.anonymous-session",
      JSON.stringify({
        workspaceId: "ws_existing",
        teamId: "tm_engineering",
        deviceJwt: createDeviceJwt({ exp: pastExp() }),
      }),
    );

    await expect(restoreAnonymousSession({})).resolves.toBeNull();
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
