import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const REMINDER_NOTIFICATION_CHANNEL_ID = "daily-mood-reminders";

export function supportsLocalNotifications(
  platformOs: string = Platform.OS,
): boolean {
  return platformOs === "ios" || platformOs === "android";
}

export async function prepareReminderNotificationPlatformAsync(
  notificationsModule: Pick<
    typeof Notifications,
    | "AndroidImportance"
    | "AndroidNotificationVisibility"
    | "setNotificationChannelAsync"
  > = Notifications,
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
