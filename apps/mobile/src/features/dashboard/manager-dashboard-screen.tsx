import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ManagerDashboardContentState =
  | {
      kind: "loading";
    }
  | {
      kind: "empty";
    }
  | {
      kind: "privacy";
      visibility: "blurred" | "hidden";
    }
  | {
      kind: "ready";
    };

interface ManagerDashboardScreenProps {
  selectedDateLabel?: string;
  selectedTeamLabel?: string;
  contentState?: ManagerDashboardContentState;
}

export function ManagerDashboardScreen({
  selectedDateLabel = "This week",
  selectedTeamLabel = "Current team",
  contentState = { kind: "ready" },
}: ManagerDashboardScreenProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        testID="manager-dashboard-screen"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="title" style={styles.title}>
                Manager dashboard
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Review team-level mood patterns using aggregate analytics only.
                Individual entries, raw notes, and identity details are never
                shown here.
              </ThemedText>
            </View>

            <View style={styles.controlRow}>
              <DashboardControl
                label="Date window"
                testID="manager-dashboard-date-picker"
                theme={theme}
                value={selectedDateLabel}
              />
              <DashboardControl
                label="Team"
                testID="manager-dashboard-team-selector"
                theme={theme}
                value={selectedTeamLabel}
              />
              <DashboardControl
                disabled
                label="Export"
                testID="manager-dashboard-export-button"
                theme={theme}
                value="Coming soon"
              />
            </View>
          </View>

          {contentState.kind === "loading" ? (
            <ThemedView
              style={styles.statePanel}
              testID="manager-dashboard-loading-state"
              type="backgroundElement"
            >
              <ActivityIndicator color={theme.text} />
              <ThemedText type="subtitle">Loading dashboard</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                Gathering aggregate daily, weekly, and tag analytics for this
                team.
              </ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "empty" ? (
            <ThemedView
              style={styles.statePanel}
              testID="manager-dashboard-empty-state"
              type="backgroundElement"
            >
              <ThemedText type="subtitle">No aggregate data yet</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                This window does not yet have enough anonymous submissions to
                render dashboard widgets.
              </ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "privacy" ? (
            <ThemedView
              style={styles.statePanel}
              testID="manager-dashboard-privacy-state"
              type="backgroundElement"
            >
              <ThemedText type="subtitle">Privacy threshold active</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                {contentState.visibility === "hidden"
                  ? "This dashboard view stays hidden until the minimum anonymous sample size is reached."
                  : "This dashboard view is blurred because the current team is below the precise-value threshold."}
              </ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "ready" ? (
            <View
              style={styles.readyLayout}
              testID="manager-dashboard-ready-state"
            >
              <ThemedView style={styles.summaryPanel} type="backgroundElement">
                <ThemedText type="smallBold">Dashboard summary</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                  Aggregate data is ready for the selected team and date window.
                  Charts will connect to the daily, weekly, and tag endpoints in
                  the next step.
                </ThemedText>
              </ThemedView>

              <View style={styles.cardGrid}>
                <DashboardSlotCard
                  description="Chart-ready daily buckets and privacy state."
                  testID="manager-dashboard-daily-slot"
                  title="Daily heatmap"
                />
                <DashboardSlotCard
                  description="Seven-day trend points with aggregate totals."
                  testID="manager-dashboard-weekly-slot"
                  title="Weekly trend"
                />
                <DashboardSlotCard
                  description="Weekly tag-frequency counts and alert support."
                  testID="manager-dashboard-tags-slot"
                  title="Tag analytics"
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function DashboardControl({
  label,
  value,
  testID,
  disabled = false,
  theme,
}: {
  label: string;
  value: string;
  testID: string;
  disabled?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.controlButton,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          opacity: pressed && !disabled ? 0.85 : disabled ? 0.6 : 1,
        },
      ]}
      testID={testID}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{value}</ThemedText>
    </Pressable>
  );
}

function DashboardSlotCard({
  title,
  description,
  testID,
}: {
  title: string;
  description: string;
  testID: string;
}) {
  return (
    <ThemedView
      style={styles.slotCard}
      testID={testID}
      type="backgroundElement"
    >
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
        {description}
      </ThemedText>
    </ThemedView>
  );
}

export type { ManagerDashboardContentState, ManagerDashboardScreenProps };

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  container: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
  },
  headerCopy: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    maxWidth: 640,
  },
  controlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  controlButton: {
    minWidth: 160,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  statePanel: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    minHeight: 180,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  summaryPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  stateCopy: {
    maxWidth: 560,
  },
  readyLayout: {
    gap: Spacing.three,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  slotCard: {
    flexGrow: 1,
    flexBasis: 220,
    minHeight: 160,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
