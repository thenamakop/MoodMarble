import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "@/hooks/use-translation";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { ManagerDashboardCharts } from "@/features/dashboard/dashboard-charts";
import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { useTheme } from "@/hooks/use-theme";

type ManagerDashboardContentState =
  | {
      kind: "loading";
    }
  | {
      kind: "guarded";
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
  viewModel?: ManagerDashboardViewModel | null;
  canChangeDate?: boolean;
  canChangeTeam?: boolean;
  onSelectDate?: () => void;
  onSelectTeam?: () => void;
  onReturnHome?: () => void;
  onSignOut?: () => Promise<void> | void;
}

export function ManagerDashboardScreen({
  selectedDateLabel,
  selectedTeamLabel,
  contentState = { kind: "ready" },
  viewModel = null,
  canChangeDate = false,
  canChangeTeam = false,
  onSelectDate,
  onSelectTeam,
  onReturnHome,
  onSignOut,
}: ManagerDashboardScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const resolvedDateLabel = selectedDateLabel ?? t("dashboard.defaultLabels.thisWeek");
  const resolvedTeamLabel = selectedTeamLabel ?? t("dashboard.defaultLabels.currentTeam");

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} testID="manager-dashboard-screen">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="title" style={styles.title}>
                {t("dashboard.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {t("dashboard.subtitle")}
              </ThemedText>
            </View>

            <View style={styles.controlRow}>
              <DashboardControl
                disabled={!canChangeDate}
                label={t("dashboard.controls.dateWindow")}
                onPress={onSelectDate}
                testID="manager-dashboard-date-picker"
                theme={theme}
                value={resolvedDateLabel}
              />
              <DashboardControl
                disabled={!canChangeTeam}
                label={t("dashboard.controls.team")}
                onPress={onSelectTeam}
                testID="manager-dashboard-team-selector"
                theme={theme}
                value={resolvedTeamLabel}
              />
              <DashboardControl
                disabled
                label={t("dashboard.controls.export")}
                testID="manager-dashboard-export-button"
                theme={theme}
                value={t("dashboard.controls.comingSoon")}
              />
            </View>

            <View style={styles.headerActionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  await onSignOut?.();
                }}
                style={({ pressed }) => [
                  styles.signOutButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID="manager-dashboard-logout"
              >
                <ThemedText type="smallBold">{t("dashboard.signOut")}</ThemedText>
              </Pressable>
            </View>
          </View>

          {contentState.kind === "guarded" ? (
            <ThemedView
              style={styles.statePanel}
              testID="manager-dashboard-guarded-state"
              type="backgroundElement"
            >
              <ThemedText type="subtitle">{t("dashboard.states.guarded.title")}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                {t("dashboard.states.guarded.body")}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={onReturnHome}
                style={[
                  styles.returnButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                  },
                ]}
                testID="manager-dashboard-return-home"
              >
                <ThemedText type="smallBold">
                  {t("dashboard.states.guarded.returnButton")}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          {contentState.kind === "loading" ? (
            <ThemedView
              style={styles.statePanel}
              testID="manager-dashboard-loading-state"
              type="backgroundElement"
            >
              <ActivityIndicator color={theme.text} />
              <ThemedText type="subtitle">{t("dashboard.states.loading.title")}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                {t("dashboard.states.loading.body")}
              </ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "empty" ? (
            <ThemedView
              style={styles.statePanel}
              testID="manager-dashboard-empty-state"
              type="backgroundElement"
            >
              <ThemedText type="subtitle">{t("dashboard.states.empty.title")}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                {t("dashboard.states.empty.body")}
              </ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "privacy" ? (
            <ThemedView
              style={styles.statePanel}
              testID="manager-dashboard-privacy-state"
              type="backgroundElement"
            >
              <ThemedText type="subtitle">{t("dashboard.states.privacy.title")}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                {contentState.visibility === "hidden"
                  ? t("dashboard.states.privacy.hidden")
                  : t("dashboard.states.privacy.blurred")}
              </ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "ready" ? (
            <View style={styles.readyLayout} testID="manager-dashboard-ready-state">
              <ThemedView style={styles.summaryPanel} type="backgroundElement">
                <ThemedText type="smallBold">{t("dashboard.summary.title")}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                  {viewModel
                    ? t("dashboard.summary.withViewModel", {
                        windowLabel: viewModel.summary.windowLabel,
                        totalLabel: viewModel.summary.totalSubmissionsLabel,
                      })
                    : t("dashboard.summary.ready")}
                </ThemedText>
              </ThemedView>

              {viewModel?.banner ? (
                <ThemedView
                  style={styles.banner}
                  testID={
                    viewModel.banner.kind === "alert"
                      ? "manager-dashboard-alert-banner"
                      : "manager-dashboard-privacy-banner"
                  }
                  type="backgroundElement"
                >
                  <ThemedText type="smallBold">{viewModel.banner.title}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
                    {viewModel.banner.message}
                  </ThemedText>
                </ThemedView>
              ) : null}

              {viewModel ? (
                <ManagerDashboardCharts viewModel={viewModel} />
              ) : (
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
              )}
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
  onPress,
  theme,
}: {
  label: string;
  value: string;
  testID: string;
  disabled?: boolean;
  onPress?: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
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
    <ThemedView style={styles.slotCard} testID={testID} type="backgroundElement">
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
  headerActionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  signOutButton: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: "flex-start",
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
  returnButton: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  banner: {
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
