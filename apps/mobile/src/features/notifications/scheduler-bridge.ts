import type { LocalSettings } from "@/features/settings/model";

import { getReminderRuntimeSupport } from "./platform";
import type {
  ReminderScheduleSyncResult,
  ReminderSchedulerOptions,
} from "./scheduler";

interface CancelReminderNotificationsOptions {
  platformOs?: string;
  executionEnvironment?: string | null;
  appOwnership?: string | null;
  loadNotificationsModule?: ReminderSchedulerOptions["loadNotificationsModule"];
}

function buildUnsupportedSyncResult(): ReminderScheduleSyncResult {
  return {
    status: "unsupported",
    scheduledTimes: [],
    activeIdentifiers: [],
    createdIdentifiers: [],
    cancelledIdentifiers: [],
  };
}

function loadSchedulerModule() {
  // Use a lazy CommonJS require so Jest can still mock `./scheduler`, while
  // Metro does not trace it as a static dependency. This keeps the scheduler
  // (and transitively `expo-notifications`) out of the startup bundle.
  // eslint-disable-next-line no-eval
  return (eval("require") as typeof require)(
    "./scheduler",
  ) as typeof import("./scheduler");
}

export async function syncReminderScheduleForRuntime(
  settings: LocalSettings,
  options: ReminderSchedulerOptions = {},
): Promise<ReminderScheduleSyncResult> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (
    !runtimeSupport.supportsLocalNotifications ||
    !runtimeSupport.canManageSchedules
  ) {
    return buildUnsupportedSyncResult();
  }

  const { syncReminderSchedule } = loadSchedulerModule();
  return syncReminderSchedule(settings, options);
}

export async function syncStoredReminderScheduleForRuntime(
  options: ReminderSchedulerOptions = {},
): Promise<ReminderScheduleSyncResult> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (
    !runtimeSupport.supportsLocalNotifications ||
    !runtimeSupport.canManageSchedules
  ) {
    return buildUnsupportedSyncResult();
  }

  const { syncStoredReminderSchedule } = loadSchedulerModule();
  return syncStoredReminderSchedule(options);
}

export async function cancelReminderNotificationsForRuntime(
  options: CancelReminderNotificationsOptions = {},
): Promise<string[]> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (
    !runtimeSupport.supportsLocalNotifications ||
    !runtimeSupport.canManageSchedules
  ) {
    return [];
  }

  const { cancelScheduledReminderNotifications } = loadSchedulerModule();
  return cancelScheduledReminderNotifications(options);
}
