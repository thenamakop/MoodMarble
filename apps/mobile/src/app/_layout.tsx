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

const DEBUG_SERVER_URL = "http://10.0.2.2:7777/event";
const DEBUG_SESSION_ID = "e2e-manual-edit-audit";

function reportMobileDebugEvent(
  hypothesisId: string,
  msg: string,
  data: Record<string, unknown>,
) {
  fetch(DEBUG_SERVER_URL, {
    method: "POST",
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: "pre-fix",
      hypothesisId,
      location: "apps/mobile/src/app/_layout.tsx",
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();
  const shouldBypassTabs =
    pathname.startsWith("/admin") || pathname.startsWith("/manager");

  useEffect(() => {
    // #region debug-point E:layout-pathname-change
    reportMobileDebugEvent("E", "[DEBUG] TabLayout pathname changed.", {
      pathname,
      shouldBypassTabs,
    });
    // #endregion
  }, [pathname, shouldBypassTabs]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const nextHref = resolveSystemHref(url);
      // #region debug-point E:layout-url-event
      reportMobileDebugEvent("E", "[DEBUG] Linking url event received.", {
        url,
        nextHref,
        pathname,
      });
      // #endregion

      if (nextHref.startsWith("/")) {
        // #region debug-point E:layout-router-replace
        reportMobileDebugEvent("E", "[DEBUG] TabLayout is replacing route.", {
          nextHref,
          pathname,
        });
        // #endregion
        router.replace(nextHref as any);
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
