import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { Linking, useColorScheme } from "react-native";

import { resolveSystemHref } from "./+native-intent";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();
  const shouldBypassTabs =
    pathname.startsWith("/admin") || pathname.startsWith("/manager");

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const nextHref = resolveSystemHref(url);

      if (nextHref.startsWith("/")) {
        router.replace(nextHref);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {shouldBypassTabs ? <Slot /> : <AppTabs />}
    </ThemeProvider>
  );
}
