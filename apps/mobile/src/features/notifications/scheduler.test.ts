jest.mock("react-native", () => ({
  Platform: {
    OS: "web",
  },
}));

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

const scheduledRequestsStore = new Map<string, ScheduledRequestRecord>();
const mockSetNotificationChannelAsync = jest.fn(async () => undefined);
const mockGetAllScheduledNotificationsAsync = jest.fn(async () =>
  Array.from(scheduledRequestsStore.values()),
);
const mockScheduleNotificationAsync = jest.fn(
  async (request: ScheduledRequestInput) => {
    const identifier =
      request.identifier ??
      `generated-${String(scheduledRequestsStore.size + 1).padStart(2, "0")}`;

    scheduledRequestsStore.set(identifier, {
      identifier,
      content: {
        data: request.content.data ?? {},
      },
      trigger: request.trigger,
    });

    return identifier;
  },
);
const mockCancelScheduledNotificationAsync = jest.fn(
  async (identifier: string) => {
    scheduledRequestsStore.delete(identifier);
  },
);
const mockNotificationSchedulerModule = {
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
};
const mockNotificationPlatformModule = {
  AndroidImportance: {
    DEFAULT: "default",
  },
  AndroidNotificationVisibility: {
    PUBLIC: "public",
  },
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
};

jest.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: "default",
  },
  AndroidNotificationVisibility: {
    PUBLIC: "public",
  },
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
}));

import {
  buildReminderScheduleIdentifier,
  syncReminderSchedule,
  syncStoredReminderSchedule,
} from "@/features/notifications/scheduler";
import {
  createDefaultLocalSettings,
  setReminderOptIn,
} from "@/features/settings/model";
import {
  clearLocalSettings,
  loadLocalSettings,
  saveLocalSettings,
} from "@/features/settings/storage";

describe("local reminder scheduler", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    installStorageMocks();
    scheduledRequestsStore.clear();
  });

  afterEach(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }

    await clearLocalSettings();
    scheduledRequestsStore.clear();
    jest.clearAllMocks();

    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("creates daily reminder schedules when reminders are enabled", async () => {
    await saveLocalSettings({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    });

    const result = await syncStoredReminderSchedule(
      createSchedulerOptions("android"),
    );

    expect(result).toEqual({
      status: "scheduled",
      scheduledTimes: ["09:00", "18:00"],
      activeIdentifiers: [
        buildReminderScheduleIdentifier("09:00"),
        buildReminderScheduleIdentifier("18:00"),
      ],
      createdIdentifiers: [
        buildReminderScheduleIdentifier("09:00"),
        buildReminderScheduleIdentifier("18:00"),
      ],
      cancelledIdentifiers: [],
    });
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledTimes(1);
    expect(
      getScheduledRequest(buildReminderScheduleIdentifier("09:00")),
    ).toMatchObject({
      identifier: buildReminderScheduleIdentifier("09:00"),
      content: {
        data: {
          reminderTime: "09:00",
          source: "moodmarble-local-reminder",
        },
      },
      trigger: {
        type: "daily",
        channelId: "daily-mood-reminders",
        hour: 9,
        minute: 0,
      },
    });
  });

  it("cancels MoodMarble reminder schedules when reminders are disabled and preserves opt-out state", async () => {
    scheduledRequestsStore.set(buildReminderScheduleIdentifier("09:00"), {
      identifier: buildReminderScheduleIdentifier("09:00"),
      content: {
        data: {
          reminderTime: "09:00",
          source: "moodmarble-local-reminder",
        },
      },
      trigger: {
        type: "daily",
        channelId: "daily-mood-reminders",
        hour: 9,
        minute: 0,
      },
    });
    scheduledRequestsStore.set("unrelated-notification", {
      identifier: "unrelated-notification",
      content: {
        data: {
          source: "other-feature",
        },
      },
      trigger: null,
    });
    await saveLocalSettings({
      version: 1,
      remindersEnabled: false,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    });

    const result = await syncStoredReminderSchedule(
      createSchedulerOptions("android"),
    );

    expect(result).toEqual({
      status: "disabled",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers: [buildReminderScheduleIdentifier("09:00")],
    });
    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: false,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    });
    expect(Array.from(scheduledRequestsStore.keys())).toEqual([
      "unrelated-notification",
    ]);
  });

  it("reschedules reminders when configured times change", async () => {
    await saveLocalSettings({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:00"],
      replayOnboarding: false,
    });

    await syncStoredReminderSchedule(createSchedulerOptions("android"));

    await saveLocalSettings({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["12:30", "18:00"],
      replayOnboarding: false,
    });

    const result = await syncStoredReminderSchedule(
      createSchedulerOptions("android"),
    );

    expect(result).toEqual({
      status: "scheduled",
      scheduledTimes: ["12:30", "18:00"],
      activeIdentifiers: [
        buildReminderScheduleIdentifier("12:30"),
        buildReminderScheduleIdentifier("18:00"),
      ],
      createdIdentifiers: [
        buildReminderScheduleIdentifier("12:30"),
        buildReminderScheduleIdentifier("18:00"),
      ],
      cancelledIdentifiers: [buildReminderScheduleIdentifier("09:00")],
    });
    expect(Array.from(scheduledRequestsStore.keys()).sort()).toEqual([
      buildReminderScheduleIdentifier("12:30"),
      buildReminderScheduleIdentifier("18:00"),
    ]);
  });

  it("reconciles persisted settings across app restarts without duplicating schedules", async () => {
    await saveLocalSettings({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["18:00"],
      replayOnboarding: false,
    });

    await syncStoredReminderSchedule(createSchedulerOptions("android"));
    expect(scheduledRequestsStore.size).toBe(1);

    jest.resetModules();

    const reloadedScheduler = jest.requireActual(
      "@/features/notifications/scheduler",
    ) as typeof import("@/features/notifications/scheduler");

    const result = await reloadedScheduler.syncStoredReminderSchedule(
      createSchedulerOptions("android"),
    );

    expect(result).toEqual({
      status: "scheduled",
      scheduledTimes: ["18:00"],
      activeIdentifiers: [buildReminderScheduleIdentifier("18:00")],
      createdIdentifiers: [],
      cancelledIdentifiers: [],
    });
    expect(scheduledRequestsStore.size).toBe(1);
  });

  it("stays local-only on unsupported platforms and skips scheduler calls", async () => {
    const settings = setReminderOptIn(createDefaultLocalSettings(), true);

    const result = await syncReminderSchedule(
      settings,
      createSchedulerOptions("web"),
    );

    expect(result).toEqual({
      status: "unsupported",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers: [],
    });
    expect(mockGetAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

function getScheduledRequest(identifier: string) {
  return scheduledRequestsStore.get(identifier);
}

function installStorageMocks() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createStorageMock(),
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: createStorageMock(),
  });
}

function createStorageMock(): Storage {
  const storageMap = new Map<string, string>();

  return {
    get length() {
      return storageMap.size;
    },
    clear() {
      storageMap.clear();
    },
    getItem(key: string) {
      return storageMap.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storageMap.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storageMap.delete(key);
    },
    setItem(key: string, value: string) {
      storageMap.set(key, value);
    },
  };
}

interface ScheduledRequestRecord {
  identifier: string;
  content: {
    data?: Record<string, unknown>;
  };
  trigger: unknown;
}

interface ScheduledRequestInput {
  identifier?: string;
  content: {
    data?: Record<string, unknown>;
  };
  trigger: unknown;
}

function createSchedulerOptions(platformOs: "android" | "ios" | "web") {
  return {
    notificationsModule: mockNotificationSchedulerModule,
    platformModule: mockNotificationPlatformModule,
    platformOs,
  };
}
