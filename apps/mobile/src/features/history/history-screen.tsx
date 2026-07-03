import React, { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { Calendar, Clock } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { MOODS, MOOD_COLORS, MOOD_LABELS, type MoodValue } from "@/contracts/mood-submission";
import { LocalMoodCalendarScreen } from "@/features/history/calendar-screen";
import { LocalMoodTimelineScreen } from "@/features/history/timeline-screen";
import { useTheme } from "@/hooks/use-theme";

type HistoryView = "timeline" | "calendar";

interface LocalHistoryScreenProps {
  initialView?: HistoryView;
  onReturnHome?: () => void;
}

/**
 * Renders the local history screen with timeline and calendar views, mood filters, and navigation back home.
 *
 * @param initialView - The view shown when the screen opens.
 * @param onReturnHome - Called when the back button is pressed.
 */
export function LocalHistoryScreen({
  initialView = "timeline",
  onReturnHome,
}: LocalHistoryScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const [activeView, setActiveView] = useState<HistoryView>(initialView);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<MoodValue | null>(null);

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
            Review your private timeline, streak, and monthly mood pattern on this device only.
          </ThemedText>
        </View>

        <View style={styles.actionRow}>
          <HistorySwitchButton
            icon={Clock}
            isActive={activeView === "timeline"}
            label="Timeline"
            onPress={() => setActiveView("timeline")}
            testID="history-view-timeline"
            theme={theme}
          />
          <HistorySwitchButton
            icon={Calendar}
            isActive={activeView === "calendar"}
            label="Calendar"
            onPress={() => setActiveView("calendar")}
            testID="history-view-calendar"
            theme={theme}
          />

          <Pressable
            accessibilityLabel="Back to marbles"
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

      <View style={styles.filterRow} testID="mood-filter-row">
        <Pressable
          accessibilityLabel="Show all moods"
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMoodFilter === null }}
          onPress={() => setSelectedMoodFilter(null)}
          style={({ pressed }) => [
            styles.filterChip,
            {
              backgroundColor:
                selectedMoodFilter === null ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: selectedMoodFilter === null ? theme.text : theme.backgroundSelected,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          testID="mood-filter-all"
        >
          <ThemedText type="small" style={styles.filterChipText}>
            All
          </ThemedText>
        </Pressable>

        {MOODS.map((mood) => {
          const isSelected = selectedMoodFilter === mood;

          return (
            <Pressable
              key={mood}
              accessibilityLabel={`Filter by ${MOOD_LABELS[mood]}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedMoodFilter(isSelected ? null : mood)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: isSelected ? MOOD_COLORS[mood] : theme.backgroundSelected,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID={`mood-filter-${mood}`}
            >
              <View style={styles.filterChipContent}>
                <View style={[styles.filterChipDot, { backgroundColor: MOOD_COLORS[mood] }]} />
                <ThemedText type="small" style={styles.filterChipText}>
                  {MOOD_LABELS[mood]}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content} testID={`history-panel-${activeView}`}>
        {activeView === "timeline" ? (
          <LocalMoodTimelineScreen moodFilter={selectedMoodFilter} />
        ) : (
          <LocalMoodCalendarScreen />
        )}
      </View>
    </ThemedView>
  );
}

/**
 * Renders a switch button for the history view.
 *
 * @param icon - Icon component displayed next to the label.
 * @param isActive - Whether the button is selected.
 * @param label - Text shown on the button and in its accessibility label.
 * @param onPress - Called when the button is pressed.
 * @param testID - Test identifier for the button.
 * @param theme - Current theme values used for button and icon styling.
 */
function HistorySwitchButton({
  icon: Icon,
  isActive,
  label,
  onPress,
  testID,
  theme,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  isActive: boolean;
  label: string;
  onPress: () => void;
  testID: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const iconColor = isActive ? theme.text : theme.textSecondary;

  return (
    <Pressable
      accessibilityLabel={`${label} view`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.switchButton,
        {
          backgroundColor: isActive ? theme.backgroundSelected : theme.background,
          borderColor: isActive ? theme.text : theme.backgroundSelected,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={testID}
    >
      <View style={styles.switchButtonContent}>
        <Icon size={16} color={iconColor} />
        <ThemedText type="smallBold">{label}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.one,
  },
  header: {
    gap: Spacing.one,
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
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.two,
  },
  switchButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  switchButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  backButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  content: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.half,
    paddingHorizontal: Spacing.four,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    height: 22,
    paddingHorizontal: Spacing.half,
    paddingVertical: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
  },
  filterChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 14,
  },
});
