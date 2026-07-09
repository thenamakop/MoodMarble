import { clearLocalDeviceData } from "@/features/settings/local-data";

const mockCancelReminderNotificationsForRuntime = jest.fn(async (_options?: unknown) => undefined);
const mockClearLocalSettings = jest.fn(async () => undefined);
const mockClearLocalMoodHistory = jest.fn(async () => undefined);
const mockClearAnonymousSession = jest.fn(async () => undefined);

jest.mock("@/features/notifications/scheduler-bridge", () => ({
  cancelReminderNotificationsForRuntime: (arg?: unknown) =>
    mockCancelReminderNotificationsForRuntime(arg),
}));

jest.mock("@/features/notifications/platform", () => ({
  getReminderRuntimeSupport: jest.fn(() => ({
    supportsLocalNotifications: true,
    canManageSchedules: true,
    requiresDevelopmentBuild: false,
    notice: null,
  })),
}));

jest.mock("@/features/settings/storage", () => ({
  clearLocalSettings: async () => mockClearLocalSettings(),
}));

jest.mock("@/features/history/storage", () => ({
  clearLocalMoodHistory: async () => mockClearLocalMoodHistory(),
}));

jest.mock("@/features/onboarding/session", () => ({
  clearAnonymousSession: async () => mockClearAnonymousSession(),
}));

const { getReminderRuntimeSupport } = jest.requireMock("@/features/notifications/platform") as {
  getReminderRuntimeSupport: jest.Mock;
};

describe("clearLocalDeviceData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getReminderRuntimeSupport.mockReturnValue({
      supportsLocalNotifications: true,
      canManageSchedules: true,
      requiresDevelopmentBuild: false,
      notice: null,
    });
  });

  it("clears settings, mood history, and anonymous session when reminder cancellation succeeds", async () => {
    await clearLocalDeviceData();

    expect(mockCancelReminderNotificationsForRuntime).toHaveBeenCalledTimes(1);
    expect(mockClearLocalSettings).toHaveBeenCalledTimes(1);
    expect(mockClearLocalMoodHistory).toHaveBeenCalledTimes(1);
    expect(mockClearAnonymousSession).toHaveBeenCalledTimes(1);
  });

  it("still clears settings, mood history, and anonymous session when reminder cancellation throws", async () => {
    mockCancelReminderNotificationsForRuntime.mockRejectedValue(
      new Error("Notification runtime unavailable"),
    );

    await clearLocalDeviceData();

    expect(mockCancelReminderNotificationsForRuntime).toHaveBeenCalledTimes(1);
    expect(mockClearLocalSettings).toHaveBeenCalledTimes(1);
    expect(mockClearLocalMoodHistory).toHaveBeenCalledTimes(1);
    expect(mockClearAnonymousSession).toHaveBeenCalledTimes(1);
  });

  it("skips reminder cancellation and still clears data on unsupported runtimes", async () => {
    getReminderRuntimeSupport.mockReturnValue({
      supportsLocalNotifications: true,
      canManageSchedules: false,
      requiresDevelopmentBuild: true,
      notice: "Unsupported runtime",
    });

    await clearLocalDeviceData();

    expect(mockCancelReminderNotificationsForRuntime).not.toHaveBeenCalled();
    expect(mockClearLocalSettings).toHaveBeenCalledTimes(1);
    expect(mockClearLocalMoodHistory).toHaveBeenCalledTimes(1);
    expect(mockClearAnonymousSession).toHaveBeenCalledTimes(1);
  });

  it("uses a custom reminder cancellation function when provided", async () => {
    const customCancel = jest.fn(async () => undefined);

    await clearLocalDeviceData({ cancelReminderNotifications: customCancel });

    expect(customCancel).toHaveBeenCalledTimes(1);
    expect(mockCancelReminderNotificationsForRuntime).not.toHaveBeenCalled();
    expect(mockClearLocalSettings).toHaveBeenCalledTimes(1);
    expect(mockClearLocalMoodHistory).toHaveBeenCalledTimes(1);
    expect(mockClearAnonymousSession).toHaveBeenCalledTimes(1);
  });
});
