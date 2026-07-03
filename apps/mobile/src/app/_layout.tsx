import "@/i18n";
import { initialiseSentry } from "@/config/sentry";
import { logResolvedApiBaseUrl } from "@/lib/api";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useNotificationHandler } from "@/features/notifications/handler";
import { ThemeProvider, useThemeContext } from "@/features/theme/provider";
initialiseSentry();
logResolvedApiBaseUrl();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const { resolvedTheme } = useThemeContext();
  useNotificationHandler();

  return (
    <NavigationThemeProvider value={resolvedTheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="join-manager" />
        <Stack.Screen name="manager" />
      </Stack>
    </NavigationThemeProvider>
  );
}
