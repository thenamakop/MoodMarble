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
    expect(
      getAnonymousSessionFromParams({
        workspace_id: "ws_localdemo",
        team_id: "tm_product",
        device_jwt: "device-jwt-token",
      }),
    ).toEqual({
      workspaceId: "ws_localdemo",
      teamId: "tm_product",
      deviceJwt: "device-jwt-token",
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

  it("persists a valid bootstrap session before handing it to the app", async () => {
    await expect(
      restoreAnonymousSession({
        workspace_id: "ws_localdemo",
        team_id: "tm_product",
        device_jwt: "device-jwt-token",
      }),
    ).resolves.toEqual({
      workspaceId: "ws_localdemo",
      teamId: "tm_product",
      deviceJwt: "device-jwt-token",
    });
  });

  it("falls back to the stored anonymous session when no route bootstrap exists", async () => {
    await saveAnonymousSession({
      workspaceId: "ws_existing",
      teamId: "tm_engineering",
      deviceJwt: "stored-device-jwt",
    });

    await expect(restoreAnonymousSession({})).resolves.toEqual({
      workspaceId: "ws_existing",
      teamId: "tm_engineering",
      deviceJwt: "stored-device-jwt",
    });
  });
});
