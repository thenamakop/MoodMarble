import type { LocalSettings } from "@/features/settings/model";

import { getReminderRuntimeSupport } from "./platform";
import type { ReminderScheduleSyncResult, ReminderSchedulerOptions } from "./scheduler";

export type SchedulerModule = typeof import("./scheduler");
type SchedulerModuleLoader = () => Promise<SchedulerModule>;

interface CancelReminderNotificationsOptions {
  platformOs?: string;
  executionEnvironment?: string | null;
  appOwnership?: string | null;
  loadNotificationsModule?: ReminderSchedulerOptions["loadNotificationsModule"];
  loadSchedulerModule?: SchedulerModuleLoader;
}

export interface SyncReminderScheduleForRuntimeOptions extends ReminderSchedulerOptions {
  loadSchedulerModule?: SchedulerModuleLoader;
}

export interface SyncStoredReminderScheduleForRuntimeOptions extends ReminderSchedulerOptions {
  loadSchedulerModule?: SchedulerModuleLoader;
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

async function loadSchedulerModule(): Promise<SchedulerModule> {
  // Lazy-load the scheduler module with a dynamic import() so Metro does not
  // trace it as a static dependency. This keeps the scheduler (and transitively
  // `expo-notifications`) out of the startup bundle on unsupported runtimes.
  // Dynamic import() is safe on the new React Native architecture (Fabric/JSI)
  // where CommonJS `require` is not a global.
  return import("./scheduler");
}

async function loadSchedulerModuleWithErrorHandling(
  loadModule: SchedulerModuleLoader,
): Promise<SchedulerModule> {
  try {
    return await loadModule();
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load the reminder scheduler module. Reminder notifications cannot be managed. Original error: ${cause}`,
    );
  }
}

function withoutSchedulerLoader(
  options: SyncReminderScheduleForRuntimeOptions | SyncStoredReminderScheduleForRuntimeOptions,
): ReminderSchedulerOptions {
  const { loadSchedulerModule: _, ...schedulerOptions } = options;
  return schedulerOptions;
}

export async function syncReminderScheduleForRuntime(
  settings: LocalSettings,
  options: SyncReminderScheduleForRuntimeOptions = {},
): Promise<ReminderScheduleSyncResult> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (!runtimeSupport.supportsLocalNotifications || !runtimeSupport.canManageSchedules) {
    return buildUnsupportedSyncResult();
  }

  const loadModule = options.loadSchedulerModule ?? loadSchedulerModule;
  const { syncReminderSchedule } = await loadSchedulerModuleWithErrorHandling(loadModule);
  return syncReminderSchedule(settings, withoutSchedulerLoader(options));
}

export async function syncStoredReminderScheduleForRuntime(
  options: SyncStoredReminderScheduleForRuntimeOptions = {},
): Promise<ReminderScheduleSyncResult> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (!runtimeSupport.supportsLocalNotifications || !runtimeSupport.canManageSchedules) {
    return buildUnsupportedSyncResult();
  }

  const loadModule = options.loadSchedulerModule ?? loadSchedulerModule;
  const { syncStoredReminderSchedule } = await loadSchedulerModuleWithErrorHandling(loadModule);
  return syncStoredReminderSchedule(withoutSchedulerLoader(options));
}

export async function cancelReminderNotificationsForRuntime(
  options: CancelReminderNotificationsOptions = {},
): Promise<string[]> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (!runtimeSupport.supportsLocalNotifications || !runtimeSupport.canManageSchedules) {
    return [];
  }

  const { loadSchedulerModule: loadModule = loadSchedulerModule, ...schedulerOptions } = options;
  const { cancelScheduledReminderNotifications } =
    await loadSchedulerModuleWithErrorHandling(loadModule);
  return cancelScheduledReminderNotifications(schedulerOptions);
}
