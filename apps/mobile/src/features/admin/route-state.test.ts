import { buildAdminRouteParams, parseAdminRouteParams } from "./route-state";

describe("Admin Route Helpers", () => {
  it("builds route params from a valid session", () => {
    const session = {
      adminJwt: "test.jwt.token",
      workspaceId: "ws_123",
      workspaceName: "Test Workspace",
    };

    const params = buildAdminRouteParams(session);
    expect(params).toEqual({
      admin_jwt: "test.jwt.token",
      workspace_id: "ws_123",
      workspace_name: "Test Workspace",
    });
  });

  it("builds route params from a session without a workspace name", () => {
    const session = {
      adminJwt: "test.jwt.token",
      workspaceId: "ws_123",
    };

    const params = buildAdminRouteParams(session as any);
    expect(params).toEqual({
      admin_jwt: "test.jwt.token",
      workspace_id: "ws_123",
    });
  });

  it("parses valid route params into a session partial", () => {
    const params = {
      admin_jwt: "test.jwt.token",
      workspace_id: "ws_123",
      workspace_name: "Test Workspace",
    };

    const session = parseAdminRouteParams(params);
    expect(session).toEqual({
      adminJwt: "test.jwt.token",
      workspaceId: "ws_123",
      workspaceName: "Test Workspace",
    });
  });

  it("handles missing or partial route params gracefully", () => {
    const params = {
      admin_jwt: "test.jwt.token",
      // missing workspace_id and workspace_name
    };

    const session = parseAdminRouteParams(params);
    expect(session).toEqual({
      adminJwt: "test.jwt.token",
      workspaceId: undefined,
      workspaceName: undefined,
    });
  });

  it("handles array params by taking the first valid string", () => {
    const params = {
      admin_jwt: ["", "test.jwt.token"],
      workspace_id: ["ws_123", "ws_456"],
    };

    const session = parseAdminRouteParams(params);
    expect(session).toEqual({
      adminJwt: "test.jwt.token",
      workspaceId: "ws_123",
      workspaceName: undefined,
    });
  });
});
