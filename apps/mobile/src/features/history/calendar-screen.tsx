import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import {
  buildLocalMoodCalendarMonth,
  getCalendarMonthStart,
  shiftCalendarMonth,
  type LocalMoodCalendarMonth,
} from "@/features/history/calendar";
import type { LocalMoodHistoryDayGroup } from "@/features/history/model";
import { loadGroupedLocalMoodHistory } from "@/features/history/storage";
import { MOOD_COLORS, MOOD_LABELS } from "@/contracts/mood-submission";
import { useTheme } from "@/hooks/use-theme";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface LocalMoodCalendarScreenProps {
  loadCalendar?: () => Promise<LocalMoodHistoryDayGroup[]>;
  getCurrentDate?: () => Date;
  nested?: boolean;
}

export function LocalMoodCalendarScreen({
  loadCalendar = loadGroupedLocalMoodHistory,
  getCurrentDate = () => new Date(),
  nested = false,
}: LocalMoodCalendarScreenProps) {
  const theme = useTheme();
  const [dayGroups, setDayGroups] = useState<LocalMoodHistoryDayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => getCalendarMonthStart(getCurrentDate()));

  const safeBottomPadding = useMemo(() => {
    if (Platform.OS === "web") {
      return Spacing.five;
    }

    return BottomTabInset + Spacing.four;
  }, []);
  const month = useMemo<LocalMoodCalendarMonth>(
    () => buildLocalMoodCalendarMonth(dayGroups, selectedMonth),
    [dayGroups, selectedMonth],
  );
  const handleSelectPreviousMonth = useCallback(() => {
    setSelectedMonth((currentMonth) => shiftCalendarMonth(currentMonth, -1));
  }, []);
  const handleSelectNextMonth = useCallback(() => {
    setSelectedMonth((currentMonth) => shiftCalendarMonth(currentMonth, 1));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateCalendar() {
      try {
        const nextGroups = await loadCalendar();

        if (!cancelled) {
          setDayGroups(nextGroups);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void hydrateCalendar();

    return () => {
      cancelled = true;
    };
  }, [loadCalendar]);

  const calendarContent = (
    <>
      <View style={styles.heroSection}>
        <ThemedText type="title" style={styles.title}>
          Your mood calendar
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Review this month at a glance. Each marked day reflects your dominant saved mood on this
          device only.
        </ThemedText>
      </View>

      {isLoading ? (
        <ThemedView type="backgroundElement" style={styles.loadingPanel}>
          <ActivityIndicator color={theme.text} />
          <ThemedText themeColor="textSecondary">Loading your saved calendar...</ThemedText>
        </ThemedView>
      ) : (
        <ThemedView type="backgroundElement" style={styles.calendarPanel} testID="calendar-panel">
          <View style={styles.calendarHeader}>
            <View style={styles.monthHeaderRow}>
              <Pressable
                accessibilityLabel="Previous month"
                accessibilityRole="button"
                onPress={handleSelectPreviousMonth}
                style={({ pressed }) => [
                  styles.monthNavButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID="calendar-previous-month"
              >
                <ThemedText type="smallBold">Previous</ThemedText>
              </Pressable>

              <View style={styles.monthHeaderCopy}>
                <ThemedText type="subtitle" style={styles.monthTitle}>
                  {month.monthLabel}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {month.markedDayCount} marked day
                  {month.markedDayCount === 1 ? "" : "s"}
                </ThemedText>
              </View>

              <Pressable
                accessibilityLabel="Next month"
                accessibilityRole="button"
                onPress={handleSelectNextMonth}
                style={({ pressed }) => [
                  styles.monthNavButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID="calendar-next-month"
              >
                <ThemedText type="smallBold">Next</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <ThemedText
                key={label}
                themeColor="textSecondary"
                type="smallBold"
                style={styles.weekdayLabel}
              >
                {label}
              </ThemedText>
            ))}
          </View>

          <View style={styles.weekList}>
            {month.weeks.map((week, weekIndex) => (
              <View key={`${month.monthKey}-week-${weekIndex}`} style={styles.weekRow}>
                {week.map((cell, dayIndex) => (
                  <ThemedView
                    key={cell.dateKey ?? `${month.monthKey}-blank-${weekIndex}-${dayIndex}`}
                    type="background"
                    style={[
                      styles.dayCell,
                      {
                        borderColor: cell.isCurrentMonth ? theme.backgroundSelected : "transparent",
                        opacity: cell.isCurrentMonth ? 1 : 0.4,
                      },
                    ]}
                    testID={cell.dateKey ? `calendar-day-${cell.dateKey}` : undefined}
                  >
                    <ThemedText
                      themeColor={cell.isCurrentMonth ? "text" : "textSecondary"}
                      type="smallBold"
                    >
                      {cell.dayOfMonth ?? ""}
                    </ThemedText>

                    {cell.dominantMood ? (
                      <View
                        accessibilityLabel={`Dominant mood ${MOOD_LABELS[cell.dominantMood]}`}
                        style={styles.dayMarkerWrap}
                        testID={`calendar-marker-${cell.dateKey}`}
                      >
                        <View
                          style={[
                            styles.dayMarkerDot,
                            {
                              backgroundColor: MOOD_COLORS[cell.dominantMood],
                            },
                          ]}
                        />
                        <ThemedText type="small" style={styles.dayMarkerLabel}>
                          {MOOD_LABELS[cell.dominantMood]}
                        </ThemedText>
                      </View>
                    ) : null}
                  </ThemedView>
                ))}
              </View>
            ))}
          </View>

          {month.markedDayCount === 0 ? (
            <ThemedText
              themeColor="textSecondary"
              style={styles.helperText}
              testID="calendar-empty-state"
            >
              No marbles saved this month yet. The calendar will light up as you log a few private
              check-ins.
            </ThemedText>
          ) : month.markedDayCount < 3 ? (
            <ThemedText
              themeColor="textSecondary"
              style={styles.helperText}
              testID="calendar-sparse-state"
            >
              A few days are starting to appear. Keep going to build a clearer monthly pattern.
            </ThemedText>
          ) : null}
        </ThemedView>
      )}
    </>
  );

  if (nested) {
    return (
      <View style={[styles.nestedContainer, { paddingBottom: safeBottomPadding }]}>
        {calendarContent}
      </View>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: safeBottomPadding }]}
        >
          {calendarContent}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
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
  nestedContainer: {
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
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
    maxWidth: 560,
  },
  loadingPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: "center",
  },
  calendarPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  calendarHeader: {
    gap: Spacing.one,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  monthHeaderCopy: {
    flex: 1,
    gap: Spacing.one,
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  monthNavButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
  },
  weekList: {
    gap: Spacing.one,
  },
  weekRow: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  dayCell: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  dayMarkerWrap: {
    gap: Spacing.half,
  },
  dayMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayMarkerLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  helperText: {
    maxWidth: 420,
  },
});
