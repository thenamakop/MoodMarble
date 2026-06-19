import { Platform } from "react-native";

export const REMINDER_NOTIFICATION_CHANNEL_ID = "daily-mood-reminders";
export const EXPO_GO_ANDROID_REMINDER_NOTICE =
  "Reminder times still save on this device. Android reminder notifications require a development build because Expo Go does not support this native runtime.";

export interface ReminderNotificationPlatformModule {
  AndroidImportance: {
    DEFAULT: unknown;
  };
  AndroidNotificationVisibility: {
    PUBLIC: unknown;
  };
  setNotificationChannelAsync: (
    channelId: string,
    channel: {
      name: string;
      description: string;
      importance: unknown;
      enableLights: boolean;
      enableVibrate: boolean;
      lightColor: string;
      lockscreenVisibility: unknown;
      showBadge: boolean;
      sound: null;
    },
  ) => Promise<unknown>;
}

export interface ReminderRuntimeSupport {
  supportsLocalNotifications: boolean;
  canManageSchedules: boolean;
  requiresDevelopmentBuild: boolean;
  notice: string | null;
}

export function supportsLocalNotifications(
  platformOs: string = Platform.OS,
): boolean {
  return platformOs === "ios" || platformOs === "android";
}

export function getReminderRuntimeSupport({
  platformOs = Platform.OS,
  executionEnvironment,
  appOwnership,
}: {
  platformOs?: string;
  executionEnvironment?: string | null;
  appOwnership?: string | null;
} = {}): ReminderRuntimeSupport {
  const runtimeEnvironment = readReminderRuntimeEnvironment();
  const resolvedExecutionEnvironment =
    executionEnvironment ?? runtimeEnvironment.executionEnvironment;
  const resolvedAppOwnership = appOwnership ?? runtimeEnvironment.appOwnership;
  const supportsNativeNotifications = supportsLocalNotifications(platformOs);

  if (!supportsNativeNotifications) {
    return {
      supportsLocalNotifications: false,
      canManageSchedules: false,
      requiresDevelopmentBuild: false,
      notice: null,
    };
  }

  const isExpoGoRuntime =
    resolvedExecutionEnvironment === "storeClient" ||
    resolvedAppOwnership === "expo";

  if (platformOs === "android" && isExpoGoRuntime) {
    return {
      supportsLocalNotifications: true,
      canManageSchedules: false,
      requiresDevelopmentBuild: true,
      notice: EXPO_GO_ANDROID_REMINDER_NOTICE,
    };
  }

  return {
    supportsLocalNotifications: true,
    canManageSchedules: true,
    requiresDevelopmentBuild: false,
    notice: null,
  };
}

export async function prepareReminderNotificationPlatformAsync(
  notificationsModule: ReminderNotificationPlatformModule,
  platformOs: string = Platform.OS,
): Promise<void> {
  if (platformOs !== "android") {
    return;
  }

  await notificationsModule.setNotificationChannelAsync(
    REMINDER_NOTIFICATION_CHANNEL_ID,
    {
      name: "Daily mood reminders",
      description: "Friendly daily prompts to check in with your mood.",
      importance: notificationsModule.AndroidImportance.DEFAULT,
      enableLights: true,
      enableVibrate: false,
      lightColor: "#208AEF",
      lockscreenVisibility:
        notificationsModule.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
      sound: null,
    },
  );
}

function readReminderRuntimeEnvironment(): {
  executionEnvironment: string | null;
  appOwnership: string | null;
} {
  try {
    const constantsModule = require("expo-constants");
    const constants = constantsModule.default ?? constantsModule;

    return {
      executionEnvironment: constants.executionEnvironment ?? null,
      appOwnership: constants.appOwnership ?? null,
    };
  } catch {
    return {
      executionEnvironment: null,
      appOwnership: null,
    };
  }
}
