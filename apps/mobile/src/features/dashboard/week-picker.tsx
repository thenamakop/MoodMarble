import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface WeekPickerProps {
  selectedWeekStart: string; // YYYY-MM-DD, always a Monday
  visible: boolean;
  onSelectWeek: (weekStart: string) => void;
  onClose: () => void;
}

interface CalendarDayCell {
  dateKey: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function WeekPicker({ selectedWeekStart, visible, onSelectWeek, onClose }: WeekPickerProps) {
  const theme = useTheme();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedWeekStart));
  const weeks = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const todayWeekStart = useMemo(() => getWeekStartDate(getTodayDateKey()), []);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop} testID="week-picker-backdrop">
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[styles.sheet, { backgroundColor: theme.background }]}
        >
          <View style={styles.header}>
            <Pressable
              hitSlop={12}
              onPress={() => setVisibleMonth((month) => shiftMonth(month, -1))}
              testID="week-picker-prev-month"
            >
              <ThemedText type="smallBold">‹</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">{formatMonthLabel(visibleMonth)}</ThemedText>
            <Pressable
              hitSlop={12}
              onPress={() => setVisibleMonth((month) => shiftMonth(month, 1))}
              testID="week-picker-next-month"
            >
              <ThemedText type="smallBold">›</ThemedText>
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((weekdayLabel) => (
              <ThemedText
                key={weekdayLabel}
                style={styles.weekdayCell}
                themeColor="textSecondary"
                type="small"
              >
                {weekdayLabel}
              </ThemedText>
            ))}
          </View>

          {weeks.map((week) => {
            const rowWeekStart = week[0]!.dateKey;
            const isSelected = rowWeekStart === selectedWeekStart;
            const isFutureWeek = rowWeekStart > todayWeekStart;

            return (
              <Pressable
                disabled={isFutureWeek}
                key={rowWeekStart}
                onPress={() => {
                  onSelectWeek(rowWeekStart);
                  onClose();
                }}
                style={[
                  styles.weekRow,
                  isSelected && { backgroundColor: theme.backgroundSelected },
                  isFutureWeek && styles.weekRowDisabled,
                ]}
                testID={`week-picker-row-${rowWeekStart}`}
              >
                {week.map((day) => (
                  <View key={day.dateKey} style={styles.dayCell}>
                    <ThemedText
                      themeColor={
                        isFutureWeek
                          ? "textSecondary"
                          : day.inCurrentMonth
                            ? "text"
                            : "textSecondary"
                      }
                      type={isSelected ? "smallBold" : "default"}
                    >
                      {day.dayOfMonth}
                    </ThemedText>
                  </View>
                ))}
              </Pressable>
            );
          })}

          <Pressable onPress={onClose} style={styles.closeButton} testID="week-picker-close">
            <ThemedText themeColor="textSecondary">Close</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStartDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const dayOfWeek = date.getUTCDay();
  const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setUTCDate(date.getUTCDate() - dayOffset);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(dateKey: string, deltaMonths: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + deltaMonths);
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function buildMonthGrid(monthAnchor: string): CalendarDayCell[][] {
  const firstOfMonth = new Date(`${monthAnchor}T00:00:00.000Z`);
  const month = firstOfMonth.getUTCMonth();
  const firstWeekday = firstOfMonth.getUTCDay();
  const leadingOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;

  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - leadingOffset);

  const cells: CalendarDayCell[] = [];
  for (let index = 0; index < 42; index++) {
    const cellDate = new Date(gridStart);
    cellDate.setUTCDate(cellDate.getUTCDate() + index);
    cells.push({
      dateKey: cellDate.toISOString().slice(0, 10),
      dayOfMonth: cellDate.getUTCDate(),
      inCurrentMonth: cellDate.getUTCMonth() === month,
    });
  }

  const weeks: CalendarDayCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: 320,
    borderRadius: 16,
    padding: Spacing.three,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: Spacing.one,
  },
  weekdayCell: {
    width: CELL_SIZE,
    textAlign: "center",
  },
  weekRow: {
    flexDirection: "row",
    borderRadius: 8,
  },
  weekRowDisabled: {
    opacity: 0.3,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    marginTop: Spacing.two,
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
});
