import { useEffect, useMemo, useState } from "react";
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
import {
  setReminderOptIn,
  setReminderTimes,
  type LocalSettings,
} from "@/features/settings/model";
import { persistLocalReminderSettings } from "@/features/settings/actions";
import {
  loadLocalSettings,
  requestStoredOnboardingReplay,
} from "@/features/settings/storage";
import { useTheme } from "@/hooks/use-theme";

import { clearLocalDeviceData } from "./local-data";

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
  requestNotificationPermission:
    requestPermission = requestNotificationPermission,
  openAppSettings = async () => {
    await Linking.openSettings();
  },
}: SettingsScreenProps) {
  const theme = useTheme();
  const reminderRuntimeSupport = getReminderRuntimeSupport();
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [draftReminderTimes, setDraftReminderTimes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(true);
  const [isClearPromptVisible, setIsClearPromptVisible] = useState(false);
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

    return (
      JSON.stringify(draftReminderTimes) !==
      JSON.stringify(settings.reminderTimes)
    );
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
        const savedSettings = await saveSettings(
          setReminderOptIn(settings, false),
        );
        setSettings(savedSettings);
        setDraftReminderTimes(savedSettings.reminderTimes);
        setStatusMessage(
          "Daily reminders are off. Your saved times stay on this device.",
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to update reminder preferences right now.",
        );
      }
      return;
    }

    if (
      !reminderRuntimeSupport.supportsLocalNotifications ||
      !reminderRuntimeSupport.canManageSchedules
    ) {
      setErrorMessage(
        reminderRuntimeSupport.notice ??
          "Reminders are not supported on this device.",
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
            ? "Notification permission was denied. Enable it in your device settings to receive reminders."
            : "Notification permission is required to send reminders.",
        );
        setPermissionStatus(currentPermission);
        return;
      }

      const savedSettings = await saveSettings(
        setReminderOptIn(settings, true),
      );
      setSettings(savedSettings);
      setDraftReminderTimes(savedSettings.reminderTimes);
      setStatusMessage(
        reminderRuntimeSupport.notice ??
          "Daily reminders are on for this device.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update reminder preferences right now.",
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
        error instanceof Error
          ? error.message
          : "Unable to open device settings.",
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
        reminderRuntimeSupport.notice ??
          "Reminders are not supported on this device.",
      );
      return;
    }

    if (settings.remindersEnabled && permissionStatus !== "granted") {
      setErrorMessage(
        "Notification permission is required. Enable reminders first or grant permission in device settings.",
      );
      return;
    }

    try {
      const savedSettings = await saveSettings(
        setReminderTimes(settings, draftReminderTimes),
      );
      setSettings(savedSettings);
      setDraftReminderTimes(savedSettings.reminderTimes);
      setStatusMessage(
        reminderRuntimeSupport.notice ?? "Reminder times saved on this device.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save reminder times right now.",
      );
    }
  }

  async function handleRequestOnboardingReplay() {
    try {
      await onRequestOnboardingReplay();
      setErrorMessage(null);
      setStatusMessage(
        "Onboarding replay is ready the next time you return home.",
      );
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to prepare onboarding replay right now.",
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
      setStatusMessage("Local data was cleared from this device.");
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to clear local data right now.",
      );
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
        <ThemedText themeColor="textSecondary">
          Loading local settings...
        </ThemedText>
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
                Settings
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Keep reminders local to this device and manage your private
                MoodMarble preferences.
              </ThemedText>
            </View>

            <View style={styles.heroActionRow}>
              <Pressable
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
                <ThemedText type="smallBold">Back to marbles</ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  await onSignOut?.();
                }}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID="settings-sign-out"
              >
                <ThemedText type="smallBold">Sign out</ThemedText>
              </Pressable>
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Daily reminders
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Turn quiet check-in prompts on or off for this device.
                </ThemedText>
              </View>
              <Switch
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
              Saved reminder times stay on this device even when reminders are
              turned off.
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
                Reminder times
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Choose 1 to 3 local times in `HH:MM` 24-hour format.
              </ThemedText>
            </View>

            <View style={styles.timeList}>
              {draftReminderTimes.map((reminderTime, index) => (
                <View key={`reminder-${index}`} style={styles.timeRow}>
                  <View style={styles.timeInputCopy}>
                    <ThemedText type="smallBold">{`Reminder ${index + 1}`}</ThemedText>
                    <TextInput
                      accessibilityLabel={`Reminder ${index + 1} time`}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      onChangeText={(nextValue) =>
                        handleReminderTimeChange(index, nextValue)
                      }
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
                      <ThemedText type="smallBold">Remove</ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={draftReminderTimes.length >= 3}
                onPress={handleAddReminderTime}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    opacity:
                      draftReminderTimes.length >= 3
                        ? 0.45
                        : pressed
                          ? 0.85
                          : 1,
                  },
                ]}
                testID="settings-add-reminder-time"
              >
                <ThemedText type="smallBold">Add time</ThemedText>
              </Pressable>

              <Pressable
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
                  Apply times
                </ThemedText>
              </Pressable>
            </View>

            {errorMessage ? (
              <ThemedText
                testID="settings-error-message"
                themeColor="textSecondary"
              >
                {errorMessage}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionCopy}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Onboarding
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Replay the Week 3 privacy-first intro without creating a new
                identity or sending anything new to the backend.
              </ThemedText>
            </View>

            <Pressable
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
              <ThemedText type="smallBold">Replay onboarding</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionCopy}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Local-only data
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Reminder settings, personal history, and the anonymous session
                stay on this device unless you clear them.
              </ThemedText>
            </View>

            <Pressable
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
              <ThemedText type="smallBold">Delete local data</ThemedText>
            </Pressable>

            {isClearPromptVisible ? (
              <View
                style={styles.clearPrompt}
                testID="settings-clear-local-data-prompt"
              >
                <ThemedText type="smallBold">
                  Clear data from this device?
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  This removes the anonymous session, local history, saved
                  reminder settings, and scheduled reminders from this device.
                  Server submissions and manager analytics stay unchanged.
                </ThemedText>

                <View style={styles.actionRow}>
                  <Pressable
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
                    <ThemedText type="smallBold">Cancel</ThemedText>
                  </Pressable>

                  <Pressable
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
                    <ThemedText
                      type="smallBold"
                      style={styles.primaryButtonText}
                    >
                      Clear this device
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ThemedView>

          {statusMessage ? (
            <ThemedView type="backgroundElement" style={styles.statusPanel}>
              <ThemedText testID="settings-status-message">
                {statusMessage}
              </ThemedText>
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
  const statusCopy = {
    granted: "Notification permission granted.",
    denied: "Notifications are blocked. Tap below to open device settings.",
    undetermined:
      "Permission not requested yet. Enable reminders to request it.",
    unsupported: "Notifications are not available on this device.",
  }[status];

  return (
    <View style={styles.permissionRow}>
      <ThemedText
        testID="settings-reminder-permission-status"
        themeColor="textSecondary"
        type="small"
      >
        {busy ? "Checking notification permission..." : statusCopy}
      </ThemedText>
      {status === "denied" ? (
        <Pressable
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
          <ThemedText type="smallBold">Open device settings</ThemedText>
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

  const [lastHour] = (existingTimes[existingTimes.length - 1] ?? "18:00")
    .split(":")
    .map(Number);
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
});
