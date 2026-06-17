import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { LocalMoodCalendarScreen } from "@/features/history/calendar-screen";
import { LocalMoodTimelineScreen } from "@/features/history/timeline-screen";
import { useTheme } from "@/hooks/use-theme";

type HistoryView = "timeline" | "calendar";

interface LocalHistoryScreenProps {
  initialView?: HistoryView;
  onReturnHome?: () => void;
}

export function LocalHistoryScreen({
  initialView = "timeline",
  onReturnHome,
}: LocalHistoryScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const [activeView, setActiveView] = useState<HistoryView>(initialView);

  const handleReturnHome = useCallback(() => {
    if (onReturnHome) {
      onReturnHome();
      return;
    }

    router.push("/");
  }, [onReturnHome, router]);

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText type="title" style={styles.title}>
            Local history
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Review your private timeline, streak, and monthly mood pattern on
            this device only.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <View style={styles.switchRow}>
            <HistorySwitchButton
              isActive={activeView === "timeline"}
              label="Timeline"
              onPress={() => setActiveView("timeline")}
              testID="history-view-timeline"
              theme={theme}
            />
            <HistorySwitchButton
              isActive={activeView === "calendar"}
              label="Calendar"
              onPress={() => setActiveView("calendar")}
              testID="history-view-calendar"
              theme={theme}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleReturnHome}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID="history-return-home"
          >
            <ThemedText type="smallBold">Back to marbles</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.content} testID={`history-panel-${activeView}`}>
        {activeView === "timeline" ? (
          <LocalMoodTimelineScreen />
        ) : (
          <LocalMoodCalendarScreen />
        )}
      </View>
    </ThemedView>
  );
}

function HistorySwitchButton({
  isActive,
  label,
  onPress,
  testID,
  theme,
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
  testID: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.switchButton,
        {
          backgroundColor: isActive
            ? theme.backgroundSelected
            : theme.background,
          borderColor: isActive ? theme.text : theme.backgroundSelected,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={testID}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  headerCopy: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    maxWidth: 560,
  },
  actions: {
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  switchButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  content: {
    flex: 1,
  },
});
