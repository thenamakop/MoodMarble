import { usePathname, useRouter } from "expo-router";
import { Pressable, View, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

/**
 * Custom web tab bar rendered by the (tabs) Tabs navigator on web.
 *
 * Passed as the `tabBar` prop to `<Tabs>` in `(tabs)/_layout.web.tsx`, so it
 * replaces the default BottomTabBar. The screen content itself is rendered by
 * the Tabs navigator via its normal slot mechanism — this component only draws
 * the navigation pill at the top.
 */
export default function AppTabs() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <CustomTabList>
      <TabButton
        isFocused={pathname === "/" || pathname === ""}
        onPress={() => {
          router.push("/");
        }}
      >
        Marbles
      </TabButton>
      <TabButton
        isFocused={pathname === "/history"}
        onPress={() => {
          router.push("/history");
        }}
      >
        History
      </TabButton>
      <TabButton
        isFocused={pathname === "/settings"}
        onPress={() => {
          router.push("/settings");
        }}
      >
        Settings
      </TabButton>
    </CustomTabList>
  );
}

export function TabButton({
  children,
  isFocused,
  onPress,
}: {
  children: React.ReactNode;
  isFocused?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.tabButtonPressable, pressed && styles.pressed]}
    >
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        style={styles.tabButtonView}
      >
        <ThemedText type="small" themeColor={isFocused ? "text" : "textSecondary"}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const colorPalette = Colors[scheme];

  return (
    <View style={styles.tabListContainer}>
      <ThemedView
        style={[
          styles.innerContainer,
          {
            borderColor: colorPalette.border,
          },
        ]}
        type="backgroundElement"
      >
        <ThemedText type="smallBold" style={styles.brandText}>
          MoodMarble
        </ThemedText>

        {children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
  },
  tabListContainer: {
    position: "absolute",
    width: "100%",
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
  },
  brandText: {
    marginRight: "auto",
  },
  tabButtonPressable: {
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
