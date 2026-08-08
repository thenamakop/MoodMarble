import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { Bell, RefreshCw, Trash2 } from "lucide-react-native";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { getReminderRuntimeSupport } from "@/features/notifications/platform";
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from "@/features/notifications/permissions";
import { setReminderOptIn, setReminderTimes, type LocalSettings } from "@/features/settings/model";
import { persistLocalReminderSettings } from "@/features/settings/actions";
import { loadLocalSettings, requestStoredOnboardingReplay } from "@/features/settings/storage";
import { useTheme } from "@/hooks/use-theme";

import { clearLocalDeviceData } from "./local-data";
import { seedSampleLocalMoodHistory } from "./seed-local-history";

const SUGGESTED_REMINDER_TIMES = ["09:00", "13:00", "18:00"];

interface SettingsScreenProps {
  loadSettings?: () => Promise<LocalSettings>;
  onClearLocalData?: () => Promise<void> | void;
  onRequestOnboardingReplay?: () => Promise<unknown> | void;
  onReturnHome?: () => void;
  onSignOut?: () => Promise<void> | void;
  saveSettings?: (settings: LocalSettings) => Promise<LocalSettings>;
  getNotificationPermission?: () => Promise<NotificationPermissionStatus>;
  requestNotificationPermission?: () => Promise<NotificationPermissionStatus>;
  openAppSettings?: () => Promise<void>;
}

export function SettingsScreen({
  loadSettings = loadLocalSettings,
  onClearLocalData = clearLocalDeviceData,
  onRequestOnboardingReplay = requestStoredOnboardingReplay,
  onReturnHome,
  onSignOut,
  saveSettings = persistLocalReminderSettings,
  getNotificationPermission = getNotificationPermissionStatus,
  requestNotificationPermission: requestPermission = requestNotificationPermission,
  openAppSettings = async () => {
    await Linking.openSettings();
  },
}: SettingsScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const reminderRuntimeSupport = getReminderRuntimeSupport();
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [draftReminderTimes, setDraftReminderTimes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(true);
  const [isClearPromptVisible, setIsClearPromptVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("undetermined");
  const [isPermissionBusy, setIsPermissionBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSettings() {
      setIsBusy(true);

      try {
        const nextSettings = await loadSettings();

        if (cancelled) {
          return;
        }

        setSettings(nextSettings);
        setDraftReminderTimes(nextSettings.reminderTimes);
      } finally {
        if (!cancelled) {
          setIsBusy(false);
        }
      }
    }

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, [loadSettings]);

  useEffect(() => {
    let cancelled = false;

    async function checkPermission() {
      const status = await getNotificationPermission();

      if (!cancelled) {
        setPermissionStatus(status);
      }
    }

    void checkPermission();

    return () => {
      cancelled = true;
    };
  }, [getNotificationPermission]);

  const hasTimeChanges = useMemo(() => {
    if (!settings) {
      return false;
    }

    return JSON.stringify(draftReminderTimes) !== JSON.stringify(settings.reminderTimes);
  }, [draftReminderTimes, settings]);

  async function refreshPermissionStatus() {
    const status = await getNotificationPermission();
    setPermissionStatus(status);
  }

  async function handleToggleReminders(enabled: boolean) {
    if (!settings) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    if (!enabled) {
      try {
        const savedSettings = await saveSettings(setReminderOptIn(settings, false));
        setSettings(savedSettings);
        setDraftReminderTimes(savedSettings.reminderTimes);
        setStatusMessage(t("settings.statusMessages.remindersOff"));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : t("settings.errorMessages.reminderPreferences"),
        );
      }
      return;
    }

    if (
      !reminderRuntimeSupport.supportsLocalNotifications ||
      !reminderRuntimeSupport.canManageSchedules
    ) {
      setErrorMessage(
        reminderRuntimeSupport.notice ?? t("settings.errorMessages.remindersNotSupported"),
      );
      return;
    }

    setIsPermissionBusy(true);

    try {
      let currentPermission = permissionStatus;

      if (currentPermission !== "granted") {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== "granted") {
        setErrorMessage(
          currentPermission === "denied"
            ? t("settings.errorMessages.permissionDenied")
            : t("settings.errorMessages.permissionRequired"),
        );
        setPermissionStatus(currentPermission);
        return;
      }

      const savedSettings = await saveSettings(setReminderOptIn(settings, true));
      setSettings(savedSettings);
      setDraftReminderTimes(savedSettings.reminderTimes);
      setStatusMessage(reminderRuntimeSupport.notice ?? t("settings.statusMessages.remindersOn"));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("settings.errorMessages.reminderPreferences"),
      );
    } finally {
      setIsPermissionBusy(false);
      await refreshPermissionStatus();
    }
  }

  async function handleOpenNotificationSettings() {
    try {
      await openAppSettings();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("settings.errorMessages.openDeviceSettings"),
      );
    }
  }

  async function handleApplyReminderTimes() {
    if (!settings) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    if (
      settings.remindersEnabled &&
      (!reminderRuntimeSupport.supportsLocalNotifications ||
        !reminderRuntimeSupport.canManageSchedules)
    ) {
      setErrorMessage(
        reminderRuntimeSupport.notice ?? t("settings.errorMessages.remindersNotSupported"),
      );
      return;
    }

    if (settings.remindersEnabled && permissionStatus !== "granted") {
      setErrorMessage(t("settings.errorMessages.permissionRequiredForApply"));
      return;
    }

    try {
      const savedSettings = await saveSettings(setReminderTimes(settings, draftReminderTimes));
      setSettings(savedSettings);
      setDraftReminderTimes(savedSettings.reminderTimes);
      setStatusMessage(
        reminderRuntimeSupport.notice ?? t("settings.statusMessages.reminderTimesSaved"),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("settings.errorMessages.saveReminderTimes"),
      );
    }
  }

  async function handleRequestOnboardingReplay() {
    try {
      await onRequestOnboardingReplay();
      setErrorMessage(null);
      setStatusMessage(t("settings.statusMessages.onboardingReplayReady"));
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : t("settings.errorMessages.onboardingReplay"),
      );
    }
  }

  async function handleConfirmClearLocalData() {
    try {
      await onClearLocalData();
      setIsClearPromptVisible(false);
      const defaultSettings = await loadSettings();
      setSettings(defaultSettings);
      setDraftReminderTimes(defaultSettings.reminderTimes);
      setErrorMessage(null);
      setStatusMessage(t("settings.statusMessages.localDataCleared"));
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : t("settings.errorMessages.clearLocalData"),
      );
    }
  }

  async function handleSeedLocalHistory() {
    setIsSeeding(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await seedSampleLocalMoodHistory();
      setStatusMessage("Sample local history seeded. Open History to view.");
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to seed sample local history.",
      );
    } finally {
      setIsSeeding(false);
    }
  }

  function handleAddReminderTime() {
    if (draftReminderTimes.length >= 3) {
      return;
    }

    setDraftReminderTimes((currentTimes) => [
      ...currentTimes,
      getNextSuggestedReminderTime(currentTimes),
    ]);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleRemoveReminderTime(index: number) {
    if (draftReminderTimes.length <= 1) {
      return;
    }

    setDraftReminderTimes((currentTimes) =>
      currentTimes.filter((_, currentIndex) => currentIndex !== index),
    );
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleReminderTimeChange(index: number, nextValue: string) {
    setDraftReminderTimes((currentTimes) =>
      currentTimes.map((currentTime, currentIndex) =>
        currentIndex === index ? nextValue : currentTime,
      ),
    );
    setErrorMessage(null);
    setStatusMessage(null);
  }

  if (isBusy || !settings) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator color={theme.text} />
        <ThemedText themeColor="textSecondary">{t("settings.loadingSettings")}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          testID="settings-scroll-view"
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.heroSection}>
            <View style={styles.heroCopy}>
              <ThemedText type="title" style={styles.title}>
                {t("settings.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {t("settings.subtitle")}
              </ThemedText>
            </View>

            <View style={styles.heroActionRow}>
              <Pressable
                accessibilityLabel={t("settings.backToMarblesLabel")}
                accessibilityRole="button"
                onPress={onReturnHome}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID="settings-return-home"
              >
                <ThemedText type="smallBold">{t("settings.backToMarbles")}</ThemedText>
              </Pressable>

              <Pressable
                accessibilityLabel={t("settings.signOutLabel")}
                accessibilityRole="button"
                disabled={isSigningOut}
                onPress={async () => {
                  if (!onSignOut || isSigningOut) {
                    return;
                  }

                  setIsSigningOut(true);
                  setErrorMessage(null);
                  setStatusMessage(null);

                  try {
                    await onSignOut();
                  } catch (error) {
                    setStatusMessage(null);
                    setErrorMessage(
                      error instanceof Error ? error.message : t("settings.errorMessages.signOut"),
                    );
                  } finally {
                    setIsSigningOut(false);
                  }
                }}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed || isSigningOut ? 0.85 : 1,
                  },
                ]}
                testID="settings-sign-out"
              >
                {isSigningOut ? (
                  <ActivityIndicator color={theme.text} size="small" />
                ) : (
                  <ThemedText type="smallBold">{t("common.signOut")}</ThemedText>
                )}
              </Pressable>
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <View style={styles.sectionTitleRow}>
                  <Bell size={16} color={theme.text} />
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {t("settings.remindersSection.title")}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary">
                  {t("settings.remindersSection.subtitle")}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={t("settings.remindersSection.switchLabel")}
                disabled={
                  isPermissionBusy ||
                  !reminderRuntimeSupport.supportsLocalNotifications ||
                  !reminderRuntimeSupport.canManageSchedules
                }
                onValueChange={handleToggleReminders}
                testID="settings-reminders-switch"
                trackColor={{
                  false: theme.backgroundSelected,
                  true: "#208AEF",
                }}
                value={settings.remindersEnabled}
              />
            </View>
            <ThemedText themeColor="textSecondary" type="small">
              {t("settings.remindersSection.savedTimesNotice")}
            </ThemedText>
            <PermissionStatusRow
              busy={isPermissionBusy}
              onOpenSettings={handleOpenNotificationSettings}
              status={permissionStatus}
              theme={theme}
            />
            {reminderRuntimeSupport.notice ? (
              <ThemedText
                testID="settings-reminder-runtime-notice"
                themeColor="textSecondary"
                type="small"
              >
                {reminderRuntimeSupport.notice}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionCopy}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {t("settings.reminderTimesSection.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {t("settings.reminderTimesSection.subtitle")}
              </ThemedText>
            </View>

            <View style={styles.timeList}>
              {draftReminderTimes.map((reminderTime, index) => (
                <View key={`reminder-${index}`} style={styles.timeRow}>
                  <View style={styles.timeInputCopy}>
                    <ThemedText type="smallBold">
                      {t("settings.reminderTimesSection.reminderLabel", { n: index + 1 })}
                    </ThemedText>
                    <TextInput
                      accessibilityLabel={t("settings.reminderTimesSection.reminderTimeLabel", {
                        n: index + 1,
                      })}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      onChangeText={(nextValue) => handleReminderTimeChange(index, nextValue)}
                      placeholder="18:00"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.timeInput,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      testID={`settings-reminder-time-${index}`}
                      value={reminderTime}
                    />
                  </View>

                  {draftReminderTimes.length > 1 ? (
                    <Pressable
                      accessibilityLabel={t("settings.reminderTimesSection.removeReminderLabel", {
                        n: index + 1,
                      })}
                      accessibilityRole="button"
                      onPress={() => handleRemoveReminderTime(index)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.backgroundSelected,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      testID={`settings-remove-reminder-${index}`}
                    >
                      <ThemedText type="smallBold">
                        {t("settings.reminderTimesSection.removeButton")}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                accessibilityLabel={t("settings.reminderTimesSection.addTimeLabel")}
                accessibilityRole="button"
                disabled={draftReminderTimes.length >= 3}
                onPress={handleAddReminderTime}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    opacity: draftReminderTimes.length >= 3 ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
                testID="settings-add-reminder-time"
              >
                <ThemedText type="smallBold">
                  {t("settings.reminderTimesSection.addTimeButton")}
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityLabel={t("settings.reminderTimesSection.applyTimesLabel")}
                accessibilityRole="button"
                disabled={!hasTimeChanges}
                onPress={handleApplyReminderTimes}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: "#208AEF",
                    opacity: !hasTimeChanges ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
                testID="settings-apply-reminder-times"
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t("settings.reminderTimesSection.applyTimesButton")}
                </ThemedText>
              </Pressable>
            </View>

            {errorMessage ? (
              <ThemedText testID="settings-error-message" themeColor="textSecondary">
                {errorMessage}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionCopy}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {t("settings.onboardingSection.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {t("settings.onboardingSection.subtitle")}
              </ThemedText>
            </View>

            <Pressable
              accessibilityLabel={t("settings.onboardingSection.replayLabel")}
              accessibilityRole="button"
              onPress={handleRequestOnboardingReplay}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="settings-replay-onboarding"
            >
              <View style={styles.buttonContent}>
                <RefreshCw size={16} color={theme.text} />
                <ThemedText type="smallBold">
                  {t("settings.onboardingSection.replayButton")}
                </ThemedText>
              </View>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionCopy}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {t("settings.localDataSection.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {t("settings.localDataSection.subtitle")}
              </ThemedText>
            </View>

            <Pressable
              accessibilityLabel={t("settings.localDataSection.deleteLabel")}
              accessibilityRole="button"
              onPress={() => setIsClearPromptVisible(true)}
              style={({ pressed }) => [
                styles.dangerButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="settings-open-clear-local-data"
            >
              <View style={styles.buttonContent}>
                <Trash2 size={16} color={theme.text} />
                <ThemedText type="smallBold">
                  {t("settings.localDataSection.deleteButton")}
                </ThemedText>
              </View>
            </Pressable>

            {isClearPromptVisible ? (
              <View style={styles.clearPrompt} testID="settings-clear-local-data-prompt">
                <ThemedText type="smallBold">
                  {t("settings.localDataSection.clearPromptTitle")}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {t("settings.localDataSection.clearPromptBody")}
                </ThemedText>

                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityLabel={t("settings.localDataSection.cancelClearLabel")}
                    accessibilityRole="button"
                    onPress={() => setIsClearPromptVisible(false)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID="settings-cancel-clear-local-data"
                  >
                    <ThemedText type="smallBold">{t("common.cancel")}</ThemedText>
                  </Pressable>

                  <Pressable
                    accessibilityLabel={t("settings.localDataSection.confirmClearLabel")}
                    accessibilityRole="button"
                    onPress={handleConfirmClearLocalData}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: "#B3261E",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID="settings-confirm-clear-local-data"
                  >
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      {t("settings.localDataSection.confirmClearButton")}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ThemedView>

          {__DEV__ ? (
            <ThemedView type="backgroundElement" style={styles.panel}>
              <View style={styles.sectionCopy}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Debug tools
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Temporary helpers for screenshots and demos. Not available in release builds.
                </ThemedText>
              </View>

              <Pressable
                accessibilityLabel="Seed sample local mood history"
                accessibilityRole="button"
                disabled={isSeeding}
                onPress={handleSeedLocalHistory}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    opacity: isSeeding ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
                testID="settings-seed-local-history"
              >
                {isSeeding ? (
                  <ActivityIndicator color={theme.text} size="small" />
                ) : (
                  <ThemedText type="smallBold">Seed sample local history</ThemedText>
                )}
              </Pressable>
            </ThemedView>
          ) : null}

          {statusMessage ? (
            <ThemedView type="backgroundElement" style={styles.statusPanel}>
              <ThemedText testID="settings-status-message">{statusMessage}</ThemedText>
            </ThemedView>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PermissionStatusRow({
  busy,
  onOpenSettings,
  status,
  theme,
}: {
  busy: boolean;
  onOpenSettings: () => void;
  status: NotificationPermissionStatus;
  theme: ReturnType<typeof useTheme>;
}) {
  const { t } = useTranslation();
  const statusCopy = {
    granted: t("settings.permissionStatus.granted"),
    denied: t("settings.permissionStatus.denied"),
    undetermined: t("settings.permissionStatus.undetermined"),
    unsupported: t("settings.permissionStatus.unsupported"),
  }[status];

  return (
    <View style={styles.permissionRow}>
      <ThemedText
        testID="settings-reminder-permission-status"
        themeColor="textSecondary"
        type="small"
      >
        {busy ? t("settings.permissionStatus.checking") : statusCopy}
      </ThemedText>
      {status === "denied" ? (
        <Pressable
          accessibilityLabel={t("settings.permissionStatus.openSettingsLabel")}
          accessibilityRole="button"
          disabled={busy}
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.permissionButton,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              opacity: busy ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          testID="settings-open-notification-settings"
        >
          <ThemedText type="smallBold">
            {t("settings.permissionStatus.openSettingsButton")}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function getNextSuggestedReminderTime(existingTimes: string[]): string {
  for (const suggestedTime of SUGGESTED_REMINDER_TIMES) {
    if (!existingTimes.includes(suggestedTime)) {
      return suggestedTime;
    }
  }

  const [lastHour] = (existingTimes[existingTimes.length - 1] ?? "18:00").split(":").map(Number);
  const nextHour = (lastHour + 1) % 24;
  return `${String(nextHour).padStart(2, "0")}:00`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  heroSection: {
    gap: Spacing.three,
  },
  heroCopy: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    maxWidth: 560,
  },
  heroActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  backButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  panel: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  sectionCopy: {
    gap: Spacing.two,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  timeList: {
    gap: Spacing.two,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
  },
  timeInputCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  removeButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: "center",
  },
  primaryButton: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  dangerButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  clearPrompt: {
    gap: Spacing.two,
  },
  statusPanel: {
    borderRadius: 20,
    padding: Spacing.three,
  },
  permissionRow: {
    gap: Spacing.two,
  },
  permissionButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
});
