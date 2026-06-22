import type { AnonymousSession } from "@/features/onboarding/types";

export const ANONYMOUS_MEMBER_HOME_ROUTE = "/";
export const ANONYMOUS_MEMBER_HISTORY_ROUTE = "/history";
export const ANONYMOUS_MEMBER_SETTINGS_ROUTE = "/settings";
export const MANAGER_DASHBOARD_ROUTE = "/manager";
export const ADMIN_PANEL_ROUTE = "/admin";
export const ADMIN_WORKSPACE_ROUTE = "/admin/workspace";
export const ADMIN_TEAM_ROUTE = "/admin/team";
export const ADMIN_EXPORT_ROUTE = "/admin/export";

const ALLOWED_ANONYMOUS_MEMBER_ROUTES = new Set([
  ANONYMOUS_MEMBER_HOME_ROUTE,
  ANONYMOUS_MEMBER_HISTORY_ROUTE,
  ANONYMOUS_MEMBER_SETTINGS_ROUTE,
]);

const ALLOWED_MANAGER_ROUTES = new Set([MANAGER_DASHBOARD_ROUTE]);
const ALLOWED_ADMIN_ROUTES = new Set([
  ADMIN_PANEL_ROUTE,
  ADMIN_WORKSPACE_ROUTE,
  ADMIN_TEAM_ROUTE,
  ADMIN_EXPORT_ROUTE,
]);

export function isAllowedAnonymousMemberRoute(pathname: string): boolean {
  return ALLOWED_ANONYMOUS_MEMBER_ROUTES.has(normalizePathname(pathname));
}

export function getProtectedRouteRedirect(pathname: string): string | null {
  if (isAllowedAnonymousMemberRoute(pathname)) {
    return null;
  }

  return ANONYMOUS_MEMBER_HOME_ROUTE;
}

export function isAllowedManagerRoute(pathname: string): boolean {
  return ALLOWED_MANAGER_ROUTES.has(normalizePathname(pathname));
}

export function getManagerRouteRedirect(pathname: string): string | null {
  if (isAllowedManagerRoute(pathname)) {
    return null;
  }

  return MANAGER_DASHBOARD_ROUTE;
}

export function isAllowedAdminRoute(pathname: string): boolean {
  return ALLOWED_ADMIN_ROUTES.has(normalizePathname(pathname));
}

export function getAdminRouteRedirect(pathname: string): string | null {
  if (isAllowedAdminRoute(pathname)) {
    return null;
  }

  return ADMIN_PANEL_ROUTE;
}

export function resolveAnonymousHomeState(
  session: AnonymousSession | null,
): "onboarding" | "member-home" {
  return session ? "member-home" : "onboarding";
}

function normalizePathname(pathname: string): string {
  const trimmedPathname = pathname.trim();

  if (!trimmedPathname || trimmedPathname === ".") {
    return ANONYMOUS_MEMBER_HOME_ROUTE;
  }

  if (!trimmedPathname.startsWith("/")) {
    return `/${trimmedPathname}`;
  }

  return trimmedPathname;
}
