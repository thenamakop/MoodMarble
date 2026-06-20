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

async function loadSchedulerModule() {
  // Keep the scheduler out of the startup dependency graph.
  return Promise.resolve(
    (eval("require") as (modulePath: string) => typeof import("./scheduler"))(
      "./scheduler",
    ),
  );
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

  const { syncReminderSchedule } = await loadSchedulerModule();
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

  const { syncStoredReminderSchedule } = await loadSchedulerModule();
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

  const { cancelScheduledReminderNotifications } = await loadSchedulerModule();
  return cancelScheduledReminderNotifications(options);
}
