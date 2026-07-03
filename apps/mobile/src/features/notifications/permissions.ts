import { loadNativeModuleAsync } from "./native-module";
import { getReminderRuntimeSupport } from "./platform";

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined" | "unsupported";

export interface NotificationPermissionState {
  status: NotificationPermissionStatus;
  canAskAgain: boolean;
}

export interface NotificationPermissionModule {
  getPermissionsAsync: () => Promise<NotificationPermissionState>;
  requestPermissionsAsync: () => Promise<NotificationPermissionState>;
}

export interface NotificationPermissionOptions {
  platformOs?: string;
  executionEnvironment?: string | null;
  appOwnership?: string | null;
  loadNotificationsModule?: () => Promise<NotificationPermissionModule>;
}

export function normalizePermissionStatus(
  rawStatus: string | null | undefined,
  canAskAgain?: boolean,
): NotificationPermissionState {
  const status = rawStatus ?? "undetermined";

  if (status === "granted") {
    return { status: "granted", canAskAgain: true };
  }

  if (status === "denied") {
    return { status: "denied", canAskAgain: canAskAgain ?? false };
  }

  return { status: "undetermined", canAskAgain: true };
}

export async function getNotificationPermissionStatus(
  options: NotificationPermissionOptions = {},
): Promise<NotificationPermissionStatus> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (!runtimeSupport.supportsLocalNotifications || !runtimeSupport.canManageSchedules) {
    return "unsupported";
  }

  const notificationsModule = await resolveNotificationsModule(options.loadNotificationsModule);
  const permissions = await notificationsModule.getPermissionsAsync();

  return normalizePermissionStatus(permissions.status, permissions.canAskAgain).status;
}

export async function requestNotificationPermission(
  options: NotificationPermissionOptions = {},
): Promise<NotificationPermissionStatus> {
  const runtimeSupport = getReminderRuntimeSupport({
    platformOs: options.platformOs,
    executionEnvironment: options.executionEnvironment,
    appOwnership: options.appOwnership,
  });

  if (!runtimeSupport.supportsLocalNotifications || !runtimeSupport.canManageSchedules) {
    return "unsupported";
  }

  const notificationsModule = await resolveNotificationsModule(options.loadNotificationsModule);
  const permissions = await notificationsModule.requestPermissionsAsync();

  return normalizePermissionStatus(permissions.status, permissions.canAskAgain).status;
}

async function resolveNotificationsModule(
  loadNotificationsModule?: () => Promise<NotificationPermissionModule>,
): Promise<NotificationPermissionModule> {
  if (loadNotificationsModule) {
    return loadNotificationsModule();
  }

  return await loadNativeModuleAsync<NotificationPermissionModule>("expo-notifications");
}
