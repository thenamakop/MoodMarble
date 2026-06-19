jest.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: "default",
  },
  AndroidNotificationVisibility: {
    PUBLIC: "public",
  },
  setNotificationChannelAsync: jest.fn(async () => undefined),
}));

import * as Notifications from "expo-notifications";

import {
  prepareReminderNotificationPlatformAsync,
  REMINDER_NOTIFICATION_CHANNEL_ID,
  supportsLocalNotifications,
} from "@/features/notifications/platform";

describe("notification platform setup", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("reports local notifications as supported on iOS and Android only", () => {
    expect(supportsLocalNotifications("ios")).toBe(true);
    expect(supportsLocalNotifications("android")).toBe(true);
    expect(supportsLocalNotifications("web")).toBe(false);
  });

  it("creates the Android reminder channel with low-friction defaults", async () => {
    await prepareReminderNotificationPlatformAsync(Notifications, "android");

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      REMINDER_NOTIFICATION_CHANNEL_ID,
      {
        name: "Daily mood reminders",
        description: "Friendly daily prompts to check in with your mood.",
        importance: Notifications.AndroidImportance.DEFAULT,
        enableLights: true,
        enableVibrate: false,
        lightColor: "#208AEF",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: false,
        sound: null,
      },
    );
  });

  it("skips Android channel setup on unsupported platforms", async () => {
    await prepareReminderNotificationPlatformAsync(Notifications, "ios");
    await prepareReminderNotificationPlatformAsync(Notifications, "web");

    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
