import { useThemeContext } from "@/features/theme/provider";

/**
 * Returns the resolved color scheme for the current theme preference.
 *
 * If the user has selected "system", this follows the device appearance.
 * Otherwise it returns the explicit "light" or "dark" preference.
 */
export function useColorScheme(): "light" | "dark" {
  const { resolvedTheme } = useThemeContext();
  return resolvedTheme;
}
