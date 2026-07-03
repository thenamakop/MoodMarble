import { NativeTabs } from "expo-router/unstable-native-tabs";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Marbles</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("../../assets/images/tabIcons/home.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger hidden name="history" />
      <NativeTabs.Trigger hidden name="settings" />
      {/* admin-login and join-manager are NOT registered as triggers.
          They are navigated to via router.push() from the onboarding screen,
          and the _layout.tsx switches from <AppTabs /> to <Slot /> for any
          route starting with /admin or /manager or /join-manager.
          Marking them as hidden triggers would block all navigation per the
          NativeTabs API ("hidden means it cannot be navigated to in any way"). */}
    </NativeTabs>
  );
}
