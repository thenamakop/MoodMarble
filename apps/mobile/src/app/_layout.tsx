import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useNotificationHandler } from "@/features/notifications/handler";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useNotificationHandler();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="join-manager" />
        <Stack.Screen name="manager" />
      </Stack>
    </ThemeProvider>
  );
}
