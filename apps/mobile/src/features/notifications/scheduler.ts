import { Platform } from "react-native";

import type { LocalSettings, ReminderTime } from "@/features/settings/model";
import { loadLocalSettings } from "@/features/settings/storage";

import { loadNativeModuleAsync } from "./native-module";
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

type ReminderNotificationsModule = NotificationSchedulerModule & ReminderNotificationPlatformModule;

/**
 * Syncs the stored reminder schedule with local notification state.
 *
 * @param options - Optional notification scheduling and runtime overrides
 * @returns The reminder schedule sync result
 */
export async function syncStoredReminderSchedule(
  options: ReminderSchedulerOptions = {},
): Promise<ReminderScheduleSyncResult> {
  return syncReminderSchedule(await loadLocalSettings(), options);
}

/**
 * Synchronizes stored reminder notifications with the current reminder settings.
 *
 * Updates the scheduled reminders to match the enabled times, cancels reminders that are no longer desired,
 * and reports whether reminders were scheduled, disabled, or unsupported on the current runtime.
 *
 * @param settings - The persisted reminder settings to apply.
 * @param options - Optional runtime and dependency overrides.
 * @returns A sync result containing the status, scheduled times, active identifiers, and any created or cancelled identifiers.
 */
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

  if (!runtimeSupport.supportsLocalNotifications || !runtimeSupport.canManageSchedules) {
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
  const platformModule: ReminderNotificationPlatformModule =
    options.platformModule ??
    (notificationsModule as unknown as ReminderNotificationPlatformModule);

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

  const scheduledRequests = await notificationsModule.getAllScheduledNotificationsAsync();
  const existingReminderIdentifiers = new Set(
    scheduledRequests
      .filter((request) => isMoodMarbleReminderRequest(request))
      .map((request) => request.identifier),
  );
  const desiredIdentifiers = settings.reminderTimes.map(buildReminderScheduleIdentifier);
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

    const scheduledIdentifier = await notificationsModule.scheduleNotificationAsync({
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

/**
 * Cancels all scheduled reminder notifications for the current runtime.
 *
 * @returns The identifiers of the notifications that were cancelled, sorted lexicographically.
 */
export async function cancelScheduledReminderNotifications(
  options: {
    notificationsModule?: NotificationSchedulerModule;
    platformModule?: ReminderNotificationPlatformModule;
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

  if (!runtimeSupport.supportsLocalNotifications || !runtimeSupport.canManageSchedules) {
    return [];
  }

  const notificationsModule =
    options.notificationsModule ??
    (await (options.loadNotificationsModule ?? loadNotificationsModule)());
  const scheduledRequests = await notificationsModule.getAllScheduledNotificationsAsync();
  const cancelledIdentifiers: string[] = [];

  for (const request of scheduledRequests) {
    if (!isMoodMarbleReminderRequest(request)) {
      continue;
    }

    await notificationsModule.cancelScheduledNotificationAsync(request.identifier);
    cancelledIdentifiers.push(request.identifier);
  }

  return cancelledIdentifiers.sort();
}

/**
 * Builds the identifier used for a reminder schedule.
 *
 * @param reminderTime - The reminder time in `HH:MM` format
 * @returns The reminder notification identifier for `reminderTime`
 */
export function buildReminderScheduleIdentifier(reminderTime: ReminderTime): string {
  return `${REMINDER_NOTIFICATION_NAMESPACE}.${reminderTime.replace(":", "")}`;
}

/**
 * Builds the notification content for a reminder time.
 *
 * @param reminderTime - The reminder time to include in the notification metadata
 * @returns The notification content for the reminder, including its title, body, and metadata
 */
function buildReminderNotificationContent(reminderTime: ReminderTime) {
  return {
    title: "How's your marble rolling? 🪨",
    body: "Take a moment to check in — it's anonymous and takes 5 seconds.",
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

/**
 * Determines whether a notification request belongs to the reminder schedule.
 *
 * @param request - The scheduled notification request to inspect
 * @returns `true` if the request uses the reminder namespace or carries the reminder source marker, `false` otherwise
 */
function isMoodMarbleReminderRequest(request: NotificationRequest): boolean {
  if (request.identifier.startsWith(`${REMINDER_NOTIFICATION_NAMESPACE}.`)) {
    return true;
  }

  const requestData = request.content.data;

  return (
    typeof requestData?.source === "string" && requestData.source === REMINDER_NOTIFICATION_SOURCE
  );
}

async function loadNotificationsModule(): Promise<ReminderNotificationsModule> {
  // Avoid a static Metro dependency on expo-notifications during Expo Go startup.
  return await loadNativeModuleAsync<ReminderNotificationsModule>("expo-notifications");
}
