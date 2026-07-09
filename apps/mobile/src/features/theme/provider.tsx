import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { DEFAULT_THEME_PREFERENCE, type ResolvedTheme, type ThemePreference } from "./model";
import { loadThemePreference, saveThemePreference } from "./storage";

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (themePreference: ThemePreference) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  themePreference: DEFAULT_THEME_PREFERENCE,
  resolvedTheme: "light",
  setThemePreference: async () => {},
  isLoading: false,
});

interface ThemeProviderProps {
  children: ReactNode;
}

function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Provides the user's theme preference and the resolved light/dark theme.
 *
 * The provider loads the persisted preference on startup and resolves it against
 * the system appearance. Changing the preference saves it back to SecureStore.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrateThemePreference() {
      const loadedPreference = await loadThemePreference();
      const validPreference = isValidThemePreference(loadedPreference)
        ? loadedPreference
        : DEFAULT_THEME_PREFERENCE;

      if (!cancelled) {
        setThemePreferenceState(validPreference);
        setIsLoading(false);
      }
    }

    void hydrateThemePreference();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (themePreference !== "system") {
      return themePreference;
    }

    return systemColorScheme === "dark" ? "dark" : "light";
  }, [themePreference, systemColorScheme]);

  const setThemePreference = useCallback(async (nextPreference: ThemePreference) => {
    await saveThemePreference(nextPreference);
    setThemePreferenceState(nextPreference);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      resolvedTheme,
      setThemePreference,
      isLoading,
    }),
    [themePreference, resolvedTheme, setThemePreference, isLoading],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the theme context.
 *
 * Must be rendered inside a `ThemeProvider`.
 */
export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
