import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Calendar, ChevronDown, Clock } from "lucide-react-native";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { MOODS, MOOD_COLORS, MOOD_LABELS, type MoodValue } from "@/contracts/mood-submission";
import { LocalMoodCalendarScreen } from "@/features/history/calendar-screen";
import { LocalMoodTimelineScreen } from "@/features/history/timeline-screen";
import { useTheme } from "@/hooks/use-theme";

type HistoryView = "timeline" | "calendar";

interface LocalHistoryScreenProps {
  initialView?: HistoryView;
  onReturnHome?: () => void;
}

interface FilterOption {
  value: MoodValue | null;
  label: string;
  color?: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: null, label: "All" },
  ...MOODS.map((mood) => ({ value: mood, label: MOOD_LABELS[mood], color: MOOD_COLORS[mood] })),
];

export function LocalHistoryScreen({
  initialView = "timeline",
  onReturnHome,
}: LocalHistoryScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const [activeView, setActiveView] = useState<HistoryView>(initialView);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<MoodValue | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const handleReturnHome = useCallback(() => {
    if (onReturnHome) {
      onReturnHome();
      return;
    }

    router.push("/");
  }, [onReturnHome, router]);

  const handleSelectFilter = useCallback((nextFilter: MoodValue | null) => {
    setSelectedMoodFilter(nextFilter);
    setIsFilterMenuOpen(false);
  }, []);

  const currentFilterLabel = selectedMoodFilter ? MOOD_LABELS[selectedMoodFilter] : "All";
  const safeBottomPadding = useMemo(() => {
    if (Platform.OS === "web") {
      return Spacing.five;
    }

    return BottomTabInset + Spacing.four;
  }, []);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.innerContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: safeBottomPadding }]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <ThemedText type="title" style={styles.title}>
                  Local history
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                  Review your private timeline, streak, and monthly mood pattern on this device
                  only.
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityLabel="Back to marbles"
                    accessibilityRole="button"
                    onPress={handleReturnHome}
                    style={({ pressed }) => [
                      styles.actionButton,
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

                  <Pressable
                    accessibilityLabel={`Filter by mood: ${currentFilterLabel}. Open menu`}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isFilterMenuOpen }}
                    onPress={() => setIsFilterMenuOpen(true)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.filterDropdownButton,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID="mood-filter-dropdown"
                  >
                    <ThemedText type="smallBold">Filter: {currentFilterLabel}</ThemedText>
                    <ChevronDown color={theme.text} size={16} />
                  </Pressable>
                </View>

                <View style={styles.switchRow}>
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
                </View>
              </View>
            </View>

            <View style={styles.content} testID={`history-panel-${activeView}`}>
              {activeView === "timeline" ? (
                <LocalMoodTimelineScreen nested moodFilter={selectedMoodFilter} />
              ) : (
                <LocalMoodCalendarScreen nested />
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsFilterMenuOpen(false)}
        transparent
        visible={isFilterMenuOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsFilterMenuOpen(false)}
            style={StyleSheet.absoluteFill}
            testID="mood-filter-menu-backdrop"
          />

          <Pressable
            accessibilityRole="menu"
            onPress={() => {}}
            style={[
              styles.modalMenu,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
              },
            ]}
            testID="mood-filter-menu"
          >
            {FILTER_OPTIONS.map((option) => {
              const isSelected = selectedMoodFilter === option.value;

              return (
                <Pressable
                  key={option.label}
                  accessibilityLabel={`Filter by ${option.label}`}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelectFilter(option.value)}
                  style={({ pressed }) => [
                    styles.filterOption,
                    {
                      backgroundColor: option.color ?? theme.backgroundElement,
                      borderColor: isSelected ? theme.text : "transparent",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  testID={`mood-filter-option-${option.value ?? "all"}`}
                >
                  <ThemedText
                    type="smallBold"
                    style={option.color ? styles.filterOptionLightText : undefined}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </Pressable>
        </View>
      </Modal>
    </ThemedView>
  );
}

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
  },
  safeArea: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
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
  switchButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  content: {
    width: "100%",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalMenu: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
    minWidth: 200,
    maxWidth: 280,
  },
  filterOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterOptionLightText: {
    color: "#ffffff",
  },
});
