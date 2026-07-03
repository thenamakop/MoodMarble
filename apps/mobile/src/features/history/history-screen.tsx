import React, { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { Calendar, Clock, ChevronDown } from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

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
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const handleFilterSelect = useCallback((filter: MoodValue | null) => {
    setSelectedMoodFilter(filter);
    setIsFilterDropdownOpen(false);
  }, []);

  const handleReturnHome = useCallback(() => {
    if (onReturnHome) {
      onReturnHome();
      return;
    }

    router.push("/");
  }, [onReturnHome, router]);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageScrollContent}>
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

        <View style={styles.filterDropdownRow}>
          <Pressable
            accessibilityLabel="Open mood filter"
            accessibilityRole="button"
            onPress={() => setIsFilterDropdownOpen(true)}
            style={({ pressed }) => [
              styles.filterDropdownButton,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID="mood-filter-dropdown-button"
          >
            <View style={styles.filterDropdownButtonContent}>
              <ThemedText type="smallBold">
                {selectedMoodFilter ? MOOD_LABELS[selectedMoodFilter] : "All moods"}
              </ThemedText>
              <ChevronDown size={16} color={theme.text} />
            </View>
          </Pressable>

          {selectedMoodFilter ? (
            <Pressable
              accessibilityLabel="Clear mood filter"
              accessibilityRole="button"
              onPress={() => setSelectedMoodFilter(null)}
              style={({ pressed }) => [
                styles.filterClearButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="mood-filter-clear"
            >
              <ThemedText type="small">Clear</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <Modal
          animationType="fade"
          transparent
          visible={isFilterDropdownOpen}
          onRequestClose={() => setIsFilterDropdownOpen(false)}
        >
          <View style={styles.modalContainer}>
            <Pressable
              style={styles.dropdownBackdrop}
              onPress={() => setIsFilterDropdownOpen(false)}
            />

            <View
              style={[
                styles.dropdownPanel,
                { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
              ]}
            >
              <Pressable
                accessibilityLabel="Show all moods"
                accessibilityRole="button"
                onPress={() => handleFilterSelect(null)}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  {
                    backgroundColor:
                      selectedMoodFilter === null ? theme.backgroundSelected : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID="mood-filter-all"
              >
                <ThemedText type="smallBold">All moods</ThemedText>
              </Pressable>

              {MOODS.map((mood) => {
                const isSelected = selectedMoodFilter === mood;

                return (
                  <Pressable
                    key={mood}
                    accessibilityLabel={`Filter by ${MOOD_LABELS[mood]}`}
                    accessibilityRole="button"
                    onPress={() => handleFilterSelect(mood)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      {
                        backgroundColor: isSelected ? theme.backgroundSelected : "transparent",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID={`mood-filter-${mood}`}
                  >
                    <View style={styles.dropdownItemContent}>
                      <View style={[styles.dropdownDot, { backgroundColor: MOOD_COLORS[mood] }]} />
                      <ThemedText type="smallBold">{MOOD_LABELS[mood]}</ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>

        <View style={styles.content} testID={`history-panel-${activeView}`}>
          {activeView === "timeline" ? (
            <LocalMoodTimelineScreen moodFilter={selectedMoodFilter} nested />
          ) : (
            <LocalMoodCalendarScreen nested />
          )}
        </View>
      </ScrollView>
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
    flexWrap: "nowrap",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  switchButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
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
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
  },
  content: {
    // Intentionally no flex: the nested timeline/calendar provide their own height
    // so the parent ScrollView can scroll the whole page as one unit.
  },
  filterDropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  filterDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  filterDropdownButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  filterClearButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdownPanel: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.half,
    minWidth: 200,
    maxWidth: 320,
    maxHeight: "80%",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  dropdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
