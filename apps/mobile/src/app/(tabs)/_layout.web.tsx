import { Tabs } from "expo-router";

import AppTabs from "@/components/app-tabs.web";

/**
 * Web-specific (tabs) group layout.
 *
 * expo-router/unstable-native-tabs (used by _layout.tsx) is native-only.
 * On web it does not register a tab router, so every URL under (tabs)/
 * resolves to index.tsx regardless of the path — history and settings are
 * unreachable.
 *
 * This file is selected by Expo Router on web in place of _layout.tsx.
 * It uses the standard Tabs navigator (which works on web) with:
 *  - tabBarPosition "top" + a custom tabBar renderer that draws the
 *    MoodMarble pill-style nav bar (AppTabs / app-tabs.web.tsx)
 *  - all screens hidden from the default tab bar (our custom bar handles UX)
 *  - headerShown: false (the app manages its own headers)
 */
export default function TabsLayoutWeb() {
  return (
    <Tabs
      tabBar={() => <AppTabs />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
