import type { AnonymousSession } from "@/features/onboarding/types";

export const ANONYMOUS_MEMBER_HOME_ROUTE = "/";
export const ANONYMOUS_MEMBER_HISTORY_ROUTE = "/history";

const ALLOWED_ANONYMOUS_MEMBER_ROUTES = new Set([
  ANONYMOUS_MEMBER_HOME_ROUTE,
  ANONYMOUS_MEMBER_HISTORY_ROUTE,
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
