import { Redirect, usePathname } from "expo-router";

import {
  ANONYMOUS_MEMBER_HOME_ROUTE,
  getProtectedRouteRedirect,
} from "@/features/onboarding/route-boundary";

export default function UnsupportedRouteScreen() {
  const pathname = usePathname();

  return (
    <Redirect
      href={getProtectedRouteRedirect(pathname) ?? ANONYMOUS_MEMBER_HOME_ROUTE}
    />
  );
}
