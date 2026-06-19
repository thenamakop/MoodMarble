import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { LocalSettings, ReminderTime } from "@/features/settings/model";
import { loadLocalSettings } from "@/features/settings/storage";

import {
  prepareReminderNotificationPlatformAsync,
  REMINDER_NOTIFICATION_CHANNEL_ID,
  supportsLocalNotifications,
} from "./platform";

const REMINDER_NOTIFICATION_NAMESPACE = "moodmarble.local-reminder";
const REMINDER_NOTIFICATION_SOURCE = "moodmarble-local-reminder";

export interface ReminderScheduleSyncResult {
  status: "disabled" | "scheduled" | "unsupported";
  scheduledTimes: ReminderTime[];
  activeIdentifiers: string[];
  createdIdentifiers: string[];
  cancelledIdentifiers: string[];
}

type NotificationRequest = Awaited<
  ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>
>[number];

type NotificationSchedulerModule = Pick<
  typeof Notifications,
  | "cancelScheduledNotificationAsync"
  | "getAllScheduledNotificationsAsync"
  | "scheduleNotificationAsync"
>;

export async function syncStoredReminderSchedule(
  options: ReminderSchedulerOptions = {},
): Promise<ReminderScheduleSyncResult> {
  return syncReminderSchedule(await loadLocalSettings(), options);
}

export async function syncReminderSchedule(
  settings: LocalSettings,
  options: ReminderSchedulerOptions = {},
): Promise<ReminderScheduleSyncResult> {
  const platformOs = options.platformOs ?? Platform.OS;

  if (!supportsLocalNotifications(platformOs)) {
    return {
      status: "unsupported",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers: [],
    };
  }

  const notificationsModule = options.notificationsModule ?? Notifications;

  if (!settings.remindersEnabled) {
    const cancelledIdentifiers =
      await cancelScheduledReminderNotifications(notificationsModule);

    return {
      status: "disabled",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers,
    };
  }

  await prepareReminderNotificationPlatformAsync(
    options.platformModule ?? Notifications,
    platformOs,
  );

  const scheduledRequests =
    await notificationsModule.getAllScheduledNotificationsAsync();
  const existingReminderIdentifiers = new Set(
    scheduledRequests
      .filter((request) => isMoodMarbleReminderRequest(request))
      .map((request) => request.identifier),
  );
  const desiredIdentifiers = settings.reminderTimes.map(
    buildReminderScheduleIdentifier,
  );
  const desiredIdentifierSet = new Set(desiredIdentifiers);
  const cancelledIdentifiers: string[] = [];
  const createdIdentifiers: string[] = [];

  for (const identifier of existingReminderIdentifiers) {
    if (!desiredIdentifierSet.has(identifier)) {
      await notificationsModule.cancelScheduledNotificationAsync(identifier);
      cancelledIdentifiers.push(identifier);
    }
  }

  for (const reminderTime of settings.reminderTimes) {
    const identifier = buildReminderScheduleIdentifier(reminderTime);

    if (existingReminderIdentifiers.has(identifier)) {
      continue;
    }

    const scheduledIdentifier =
      await notificationsModule.scheduleNotificationAsync({
        identifier,
        content: buildReminderNotificationContent(reminderTime),
        trigger: buildReminderTrigger(reminderTime, platformOs),
      });

    createdIdentifiers.push(scheduledIdentifier);
  }

  return {
    status: "scheduled",
    scheduledTimes: settings.reminderTimes,
    activeIdentifiers: desiredIdentifiers,
    createdIdentifiers,
    cancelledIdentifiers,
  };
}

export async function cancelScheduledReminderNotifications(
  notificationsModule: NotificationSchedulerModule = Notifications,
): Promise<string[]> {
  const scheduledRequests =
    await notificationsModule.getAllScheduledNotificationsAsync();
  const cancelledIdentifiers: string[] = [];

  for (const request of scheduledRequests) {
    if (!isMoodMarbleReminderRequest(request)) {
      continue;
    }

    await notificationsModule.cancelScheduledNotificationAsync(
      request.identifier,
    );
    cancelledIdentifiers.push(request.identifier);
  }

  return cancelledIdentifiers.sort();
}

export function buildReminderScheduleIdentifier(
  reminderTime: ReminderTime,
): string {
  return `${REMINDER_NOTIFICATION_NAMESPACE}.${reminderTime.replace(":", "")}`;
}

function buildReminderNotificationContent(reminderTime: ReminderTime) {
  return {
    title: "Mood check-in",
    body: "Take a quiet moment to drop today's marble.",
    sound: false,
    data: {
      reminderTime,
      source: REMINDER_NOTIFICATION_SOURCE,
    },
  };
}

function buildReminderTrigger(reminderTime: ReminderTime, platformOs: string) {
  const [hour, minute] = reminderTime.split(":").map(Number);

  if (platformOs === "android") {
    return {
      type: "daily" as const,
      channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
      hour,
      minute,
    };
  }

  return {
    type: "calendar" as const,
    hour,
    minute,
    repeats: true,
  };
}

function isMoodMarbleReminderRequest(request: NotificationRequest): boolean {
  if (request.identifier.startsWith(`${REMINDER_NOTIFICATION_NAMESPACE}.`)) {
    return true;
  }

  const requestData = request.content.data;

  return (
    typeof requestData?.source === "string" &&
    requestData.source === REMINDER_NOTIFICATION_SOURCE
  );
}

interface ReminderSchedulerOptions {
  notificationsModule?: NotificationSchedulerModule;
  platformModule?: Parameters<
    typeof prepareReminderNotificationPlatformAsync
  >[0];
  platformOs?: string;
}
