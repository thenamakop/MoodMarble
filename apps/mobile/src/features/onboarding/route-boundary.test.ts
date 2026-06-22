import {
  ADMIN_EXPORT_ROUTE,
  ADMIN_PANEL_ROUTE,
  ADMIN_TEAM_ROUTE,
  ADMIN_WORKSPACE_ROUTE,
  ANONYMOUS_MEMBER_HISTORY_ROUTE,
  ANONYMOUS_MEMBER_HOME_ROUTE,
  ANONYMOUS_MEMBER_SETTINGS_ROUTE,
  getAdminRouteRedirect,
  MANAGER_DASHBOARD_ROUTE,
  getManagerRouteRedirect,
  getProtectedRouteRedirect,
  isAllowedAdminRoute,
  isAllowedAnonymousMemberRoute,
  isAllowedManagerRoute,
  resolveAnonymousHomeState,
} from "@/features/onboarding/route-boundary";

describe("anonymous route boundary", () => {
  it("allows access to the team-member home route", () => {
    expect(isAllowedAnonymousMemberRoute("/")).toBe(true);
    expect(isAllowedAnonymousMemberRoute("")).toBe(true);
    expect(isAllowedAnonymousMemberRoute("/history")).toBe(true);
    expect(isAllowedAnonymousMemberRoute("/settings")).toBe(true);
  });

  it("blocks unsupported role and future-feature routes", () => {
    expect(getProtectedRouteRedirect("/admin")).toBe(
      ANONYMOUS_MEMBER_HOME_ROUTE,
    );
    expect(getProtectedRouteRedirect("/admin/team")).toBe(
      ANONYMOUS_MEMBER_HOME_ROUTE,
    );
    expect(getProtectedRouteRedirect("/admin/export")).toBe(
      ANONYMOUS_MEMBER_HOME_ROUTE,
    );
    expect(getProtectedRouteRedirect("/manager")).toBe(
      ANONYMOUS_MEMBER_HOME_ROUTE,
    );
    expect(getProtectedRouteRedirect("/dashboard")).toBe(
      ANONYMOUS_MEMBER_HOME_ROUTE,
    );
    expect(getProtectedRouteRedirect("/manager/reports")).toBe(
      ANONYMOUS_MEMBER_HOME_ROUTE,
    );
  });

  it("does not redirect the supported anonymous member routes", () => {
    expect(getProtectedRouteRedirect("/")).toBeNull();
    expect(
      getProtectedRouteRedirect(ANONYMOUS_MEMBER_HISTORY_ROUTE),
    ).toBeNull();
    expect(
      getProtectedRouteRedirect(ANONYMOUS_MEMBER_SETTINGS_ROUTE),
    ).toBeNull();
  });

  it("allows the manager dashboard route only under the manager flow boundary", () => {
    expect(isAllowedManagerRoute("/manager")).toBe(true);
    expect(getManagerRouteRedirect("/manager")).toBeNull();
    expect(getManagerRouteRedirect("/admin")).toBe(MANAGER_DASHBOARD_ROUTE);
    expect(getManagerRouteRedirect("/manager/reports")).toBe(
      MANAGER_DASHBOARD_ROUTE,
    );
  });

  it("keeps the admin route tree separate from member and manager routes", () => {
    expect(isAllowedAdminRoute(ADMIN_PANEL_ROUTE)).toBe(true);
    expect(isAllowedAdminRoute(ADMIN_WORKSPACE_ROUTE)).toBe(true);
    expect(isAllowedAdminRoute(ADMIN_TEAM_ROUTE)).toBe(true);
    expect(isAllowedAdminRoute(ADMIN_EXPORT_ROUTE)).toBe(true);
    expect(isAllowedAdminRoute("/")).toBe(false);
    expect(isAllowedAdminRoute("/manager")).toBe(false);
    expect(getAdminRouteRedirect(ADMIN_TEAM_ROUTE)).toBeNull();
    expect(getAdminRouteRedirect("/history")).toBe(ADMIN_PANEL_ROUTE);
    expect(getAdminRouteRedirect("/manager")).toBe(ADMIN_PANEL_ROUTE);
  });

  it("falls back to onboarding when the anonymous session is missing", () => {
    expect(resolveAnonymousHomeState(null)).toBe("onboarding");
  });

  it("allows the anonymous member flow when the session exists", () => {
    expect(
      resolveAnonymousHomeState({
        workspaceId: "ws_localdemo",
        teamId: "tm_product",
        deviceJwt:
          "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJleHAiOjQxMDI0NDQ4MDB9.signature",
      }),
    ).toBe("member-home");
  });
});
