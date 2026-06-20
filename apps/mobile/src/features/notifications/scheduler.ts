import { Platform } from "react-native";

import type { LocalSettings, ReminderTime } from "@/features/settings/model";
import { loadLocalSettings } from "@/features/settings/storage";

import {
  getReminderRuntimeSupport,
  prepareReminderNotificationPlatformAsync,
  REMINDER_NOTIFICATION_CHANNEL_ID,
  type ReminderNotificationPlatformModule,
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

export interface ReminderSchedulerOptions {
  notificationsModule?: NotificationSchedulerModule;
  platformModule?: ReminderNotificationPlatformModule;
  platformOs?: string;
  executionEnvironment?: string | null;
  appOwnership?: string | null;
  loadNotificationsModule?: () => Promise<ReminderNotificationsModule>;
}

type NotificationRequest = Awaited<
  ReturnType<NotificationSchedulerModule["getAllScheduledNotificationsAsync"]>
>[number];

export interface NotificationSchedulerModule {
  cancelScheduledNotificationAsync: (identifier: string) => Promise<unknown>;
  getAllScheduledNotificationsAsync: () => Promise<
    {
      identifier: string;
      content: {
        data?: Record<string, unknown> | null;
      };
    }[]
  >;
  scheduleNotificationAsync: (request: {
    identifier?: string;
    content: {
      title: string;
      body: string;
      sound: boolean;
      data: {
        reminderTime: ReminderTime;
        source: string;
      };
    };
    trigger: ReturnType<typeof buildReminderTrigger>;
  }) => Promise<string>;
}

type ReminderNotificationsModule = NotificationSchedulerModule &
  ReminderNotificationPlatformModule;

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
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (
    !runtimeSupport.supportsLocalNotifications ||
    !runtimeSupport.canManageSchedules
  ) {
    return {
      status: "unsupported",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers: [],
    };
  }

  const notificationsModule =
    options.notificationsModule ??
    (await (options.loadNotificationsModule ?? loadNotificationsModule)());
  const platformModule = options.platformModule ?? notificationsModule;

  if (!settings.remindersEnabled) {
    const cancelledIdentifiers = await cancelScheduledReminderNotifications({
      notificationsModule,
      platformOs,
    });

    return {
      status: "disabled",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers,
    };
  }

  await prepareReminderNotificationPlatformAsync(platformModule, platformOs);

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
  options: {
    notificationsModule?: NotificationSchedulerModule;
    platformOs?: string;
    executionEnvironment?: string | null;
    appOwnership?: string | null;
    loadNotificationsModule?: () => Promise<ReminderNotificationsModule>;
  } = {},
): Promise<string[]> {
  const platformOs = options.platformOs ?? Platform.OS;
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (
    !runtimeSupport.supportsLocalNotifications ||
    !runtimeSupport.canManageSchedules
  ) {
    return [];
  }

  const notificationsModule =
    options.notificationsModule ??
    (await (options.loadNotificationsModule ?? loadNotificationsModule)());
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

async function loadNotificationsModule(): Promise<ReminderNotificationsModule> {
  // Avoid a static Metro dependency on expo-notifications during Expo Go startup.
  return (
    eval("require") as (moduleName: string) => ReminderNotificationsModule
  )("expo-notifications");
}
