import { NativeTabs, Label, Icon } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Marbles</Label>
        <Icon src={require("../../../assets/images/tabIcons/home.png")} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger hidden name="history" />
      <NativeTabs.Trigger hidden name="settings" />
    </NativeTabs>
  );
}
