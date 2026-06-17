import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import type { LocalMoodHistoryDayGroup } from "@/features/history/model";
import { normalizeLocalMoodHistoryRecords } from "@/features/history/model";
import { calculateLocalMoodHistoryStreakFromDayKeys } from "@/features/history/streak";
import {
  clearLocalMoodHistory,
  loadGroupedLocalMoodHistory,
} from "@/features/history/storage";
import { MOOD_COLORS, MOOD_LABELS } from "@/contracts/mood-submission";
import { useTheme } from "@/hooks/use-theme";

interface LocalMoodTimelineScreenProps {
  initialTimeline?: LocalMoodHistoryDayGroup[] | null;
  loadTimeline?: () => Promise<LocalMoodHistoryDayGroup[]>;
  clearHistory?: () => Promise<void>;
}

export function LocalMoodTimelineScreen({
  initialTimeline = null,
  loadTimeline = loadGroupedLocalMoodHistory,
  clearHistory = clearLocalMoodHistory,
}: LocalMoodTimelineScreenProps) {
  const theme = useTheme();
  const [dayGroups, setDayGroups] = useState<LocalMoodHistoryDayGroup[]>(
    initialTimeline ? normalizeTimelineGroups(initialTimeline) : [],
  );
  const [isLoading, setIsLoading] = useState(initialTimeline === null);
  const [isClearing, setIsClearing] = useState(false);

  const safeBottomPadding = useMemo(() => {
    if (Platform.OS === "web") {
      return Spacing.five;
    }

    return BottomTabInset + Spacing.four;
  }, []);
  const streak = useMemo(
    () =>
      calculateLocalMoodHistoryStreakFromDayKeys(
        dayGroups.map((group) => group.submission_date),
      ),
    [dayGroups],
  );

  const hydrateTimeline = useCallback(async () => {
    const nextGroups = normalizeTimelineGroups(await loadTimeline());
    setDayGroups(nextGroups);
  }, [loadTimeline]);

  useEffect(() => {
    if (initialTimeline) {
      return;
    }

    let cancelled = false;

    async function loadInitialTimeline() {
      try {
        const nextGroups = normalizeTimelineGroups(await loadTimeline());

        if (!cancelled) {
          setDayGroups(nextGroups);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialTimeline();

    return () => {
      cancelled = true;
    };
  }, [initialTimeline, loadTimeline]);

  const handleClearHistory = useCallback(async () => {
    setIsClearing(true);

    try {
      await clearHistory();
      await hydrateTimeline();
    } finally {
      setIsClearing(false);
    }
  }, [clearHistory, hydrateTimeline]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: safeBottomPadding },
          ]}
        >
          <View style={styles.heroSection}>
            <ThemedText type="title" style={styles.title}>
              Your mood timeline
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Your marbles stay on this device. Scan each day to spot patterns,
              streaks, and steady stretches.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={styles.streakPanel}
            testID="timeline-streak-panel"
          >
            <View style={styles.streakHeader}>
              <View style={styles.streakCopy}>
                <ThemedText type="subtitle" style={styles.streakValue}>
                  {streak.dayCount} day{streak.dayCount === 1 ? "" : "s"}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Streak ending on {streak.endDate ?? "your next marble"}
                </ThemedText>
              </View>

              {dayGroups.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isClearing }}
                  disabled={isClearing}
                  onPress={handleClearHistory}
                  style={({ pressed }) => [
                    styles.clearButton,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.backgroundSelected,
                      opacity: pressed && !isClearing ? 0.85 : 1,
                    },
                  ]}
                  testID="clear-local-history-button"
                >
                  <ThemedText type="smallBold">
                    {isClearing ? "Clearing..." : "Clear local history"}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </ThemedView>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.loadingPanel}>
              <ActivityIndicator color={theme.text} />
              <ThemedText themeColor="textSecondary">
                Loading your saved marbles...
              </ThemedText>
            </ThemedView>
          ) : dayGroups.length === 0 ? (
            <ThemedView
              type="backgroundElement"
              style={styles.emptyPanel}
              testID="timeline-empty-state"
            >
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No mood history yet
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Share your first marble to start a private timeline on this
                device.
              </ThemedText>
            </ThemedView>
          ) : (
            dayGroups.map((group) => (
              <ThemedView
                key={group.submission_date}
                type="backgroundElement"
                style={styles.dayPanel}
                testID={`timeline-day-${group.submission_date}`}
              >
                <View style={styles.dayHeader}>
                  <ThemedText type="subtitle" style={styles.dayTitle}>
                    {group.submission_date}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {group.records.length} marble
                    {group.records.length === 1 ? "" : "s"}
                  </ThemedText>
                </View>

                <View style={styles.entryList}>
                  {group.records.map((record) => (
                    <View
                      key={record.id}
                      style={[
                        styles.entryCard,
                        { borderColor: theme.backgroundSelected },
                      ]}
                      testID={`timeline-entry-${record.id}`}
                    >
                      <View style={styles.entryHeader}>
                        <View style={styles.entryMood}>
                          <View
                            style={[
                              styles.moodDot,
                              {
                                backgroundColor: MOOD_COLORS[record.mood_type],
                              },
                            ]}
                          />
                          <ThemedText type="smallBold">
                            {MOOD_LABELS[record.mood_type]}
                          </ThemedText>
                        </View>
                        <ThemedText themeColor="textSecondary" type="small">
                          {formatHourOfDay(record.hour_of_day)}
                        </ThemedText>
                      </View>

                      <ThemedText
                        themeColor="textSecondary"
                        type="small"
                        testID={`timeline-tags-${record.id}`}
                      >
                        {record.tags.length > 0
                          ? record.tags.join("  ")
                          : "No tags saved"}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function normalizeTimelineGroups(
  groups: LocalMoodHistoryDayGroup[],
): LocalMoodHistoryDayGroup[] {
  return [...groups]
    .sort((left, right) =>
      right.submission_date.localeCompare(left.submission_date),
    )
    .map((group) => ({
      ...group,
      records: normalizeLocalMoodHistoryRecords(group.records),
    }));
}

function formatHourOfDay(hourOfDay: number): string {
  if (hourOfDay === 0) {
    return "12:00 AM";
  }

  if (hourOfDay === 12) {
    return "12:00 PM";
  }

  if (hourOfDay > 12) {
    return `${hourOfDay - 12}:00 PM`;
  }

  return `${hourOfDay}:00 AM`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  heroSection: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    maxWidth: 540,
  },
  loadingPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: "center",
  },
  streakPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  streakCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  streakValue: {
    fontSize: 24,
    lineHeight: 30,
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  emptyPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  emptyText: {
    maxWidth: 420,
  },
  dayPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  dayHeader: {
    gap: Spacing.one,
  },
  dayTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  entryList: {
    gap: Spacing.two,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  entryMood: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  moodDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
