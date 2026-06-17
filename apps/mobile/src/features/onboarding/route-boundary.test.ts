import {
  ANONYMOUS_MEMBER_HISTORY_ROUTE,
  ANONYMOUS_MEMBER_HOME_ROUTE,
  getProtectedRouteRedirect,
  isAllowedAnonymousMemberRoute,
  resolveAnonymousHomeState,
} from "@/features/onboarding/route-boundary";

describe("anonymous route boundary", () => {
  it("allows access to the team-member home route", () => {
    expect(isAllowedAnonymousMemberRoute("/")).toBe(true);
    expect(isAllowedAnonymousMemberRoute("")).toBe(true);
    expect(isAllowedAnonymousMemberRoute("/history")).toBe(true);
  });

  it("blocks unsupported role and future-feature routes", () => {
    expect(getProtectedRouteRedirect("/admin")).toBe(
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
