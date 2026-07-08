import {
  EXPO_GO_ANDROID_REMINDER_NOTICE,
  getReminderRuntimeSupport,
  prepareReminderNotificationPlatformAsync,
  REMINDER_NOTIFICATION_CHANNEL_ID,
  supportsLocalNotifications,
  type ReminderNotificationPlatformModule,
} from "@/features/notifications/platform";

jest.mock("expo-constants", () => ({
  executionEnvironment: null,
  appOwnership: null,
}));

const mockPlatformModule: ReminderNotificationPlatformModule = {
  AndroidImportance: { DEFAULT: "default" },
  AndroidNotificationVisibility: { PUBLIC: "public" },
  setNotificationChannelAsync: jest.fn(async () => undefined),
};

describe("notification platform setup", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("reports local notifications as supported on iOS and Android only", () => {
    expect(supportsLocalNotifications("ios")).toBe(true);
    expect(supportsLocalNotifications("android")).toBe(true);
    expect(supportsLocalNotifications("web")).toBe(false);
  });

  it("marks Android Expo Go as local-only and development-build-required", () => {
    expect(
      getReminderRuntimeSupport({
        platformOs: "android",
        executionEnvironment: "storeClient",
        appOwnership: "expo",
      }),
    ).toEqual({
      supportsLocalNotifications: true,
      canManageSchedules: false,
      requiresDevelopmentBuild: true,
      notice: EXPO_GO_ANDROID_REMINDER_NOTICE,
    });
  });

  it("keeps native reminder scheduling enabled for Android development builds", () => {
    expect(
      getReminderRuntimeSupport({
        platformOs: "android",
        executionEnvironment: "standalone",
        appOwnership: null,
      }),
    ).toEqual({
      supportsLocalNotifications: true,
      canManageSchedules: true,
      requiresDevelopmentBuild: false,
      notice: null,
    });
  });

  it("creates the Android reminder channel with low-friction defaults", async () => {
    await prepareReminderNotificationPlatformAsync(mockPlatformModule, "android");

    expect(mockPlatformModule.setNotificationChannelAsync).toHaveBeenCalledWith(
      REMINDER_NOTIFICATION_CHANNEL_ID,
      {
        name: "Daily mood reminders",
        description: "Friendly daily prompts to check in with your mood.",
        importance: mockPlatformModule.AndroidImportance.DEFAULT,
        enableLights: true,
        enableVibrate: false,
        lightColor: "#208AEF",
        lockscreenVisibility: mockPlatformModule.AndroidNotificationVisibility.PUBLIC,
        showBadge: false,
        sound: null,
      },
    );
  });

  it("skips Android channel setup on unsupported platforms", async () => {
    await prepareReminderNotificationPlatformAsync(mockPlatformModule, "ios");
    await prepareReminderNotificationPlatformAsync(mockPlatformModule, "web");

    expect(mockPlatformModule.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
