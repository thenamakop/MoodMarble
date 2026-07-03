import { useSyncExternalStore } from "react";

import { useThemeContext } from "@/features/theme/provider";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Returns the resolved color scheme for the current theme preference.
 *
 * On web, this rehydrates safely so the value is only finalised after the
 * client has mounted. If the user has selected "system", this follows the
 * device appearance; otherwise it returns the explicit preference.
 */
export function useColorScheme(): "light" | "dark" {
  const hasHydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const { resolvedTheme } = useThemeContext();

  if (hasHydrated) {
    return resolvedTheme;
  }

  return "light";
}
