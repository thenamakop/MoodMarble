import { clearLocalMoodHistory } from "@/features/history/storage";
import { submitMoodSubmission } from "@/features/mood-submission/api";
import { joinWorkspace } from "@/features/onboarding/api";
import { clearAnonymousSession } from "@/features/onboarding/session";
import { loadNativeModuleAsync } from "@/features/notifications/native-module";
import { buildReminderScheduleIdentifier } from "@/features/notifications/scheduler";
import * as schedulerModule from "@/features/notifications/scheduler";
import { persistLocalReminderSettings } from "@/features/settings/actions";
import { createDefaultLocalSettings } from "@/features/settings/model";
import { clearLocalDeviceData } from "@/features/settings/local-data";
import {
  clearLocalSettings,
  loadLocalSettings,
  requestStoredOnboardingReplay,
} from "@/features/settings/storage";

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

jest.mock("expo-constants", () => ({
  executionEnvironment: null,
  appOwnership: null,
}));

const scheduledRequestsStore = new Map<string, ScheduledRequestRecord>();
const mockSetNotificationChannelAsync = jest.fn(async () => undefined);
const mockGetAllScheduledNotificationsAsync = jest.fn(async () =>
  Array.from(scheduledRequestsStore.values()),
);
const mockScheduleNotificationAsync = jest.fn(async (request: ScheduledRequestInput) => {
  const identifier = request.identifier ?? `generated-${scheduledRequestsStore.size + 1}`;

  scheduledRequestsStore.set(identifier, {
    identifier,
    content: {
      data: request.content.data ?? {},
    },
    trigger: request.trigger,
  });

  return identifier;
});
const mockCancelScheduledNotificationAsync = jest.fn(async (identifier: string) => {
  scheduledRequestsStore.delete(identifier);
});
const mockNotificationSchedulerModule = {
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
};
const mockPlatformModule = {
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

jest.mock("@/features/notifications/native-module", () => ({
  loadNativeModuleAsync: jest.fn(),
}));

jest.mock("@/features/history/storage", () => ({
  clearLocalMoodHistory: jest.fn(async () => undefined),
}));

jest.mock("@/features/onboarding/session", () => ({
  clearAnonymousSession: jest.fn(async () => undefined),
}));

jest.mock("@/features/onboarding/api", () => ({
  joinWorkspace: jest.fn(async () => {
    throw new Error("joinWorkspace should not be called by local settings actions");
  }),
}));

jest.mock("@/features/mood-submission/api", () => ({
  submitMoodSubmission: jest.fn(async () => {
    throw new Error("submitMoodSubmission should not be called by local settings actions");
  }),
}));

const { Platform } = jest.requireMock("react-native") as {
  Platform: { OS: string };
};
const expoConstants = jest.requireMock("expo-constants") as {
  executionEnvironment: string | null;
  appOwnership: string | null;
};

const loadSchedulerModule = async () => schedulerModule;

describe("settings local actions", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    installStorageMocks();
    scheduledRequestsStore.clear();
    Platform.OS = "web";
    expoConstants.executionEnvironment = null;
    expoConstants.appOwnership = null;
    (loadNativeModuleAsync as jest.Mock).mockResolvedValue({
      ...mockNotificationSchedulerModule,
      ...mockPlatformModule,
    });
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

  it("persists reminder preferences to local storage and reloads them consistently", async () => {
    const persistedSettings = await persistLocalReminderSettings(
      {
        version: 1,
        remindersEnabled: true,
        reminderTimes: ["09:00", "18:00"],
        replayOnboarding: false,
      },
      {
        notificationsModule: mockNotificationSchedulerModule,
        platformModule: mockPlatformModule,
        platformOs: "android",
        loadSchedulerModule,
      },
    );

    expect(persistedSettings).toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    });
    await expect(loadLocalSettings()).resolves.toEqual(persistedSettings);
    expect(Array.from(scheduledRequestsStore.keys()).sort()).toEqual([
      buildReminderScheduleIdentifier("09:00"),
      buildReminderScheduleIdentifier("18:00"),
    ]);
  });

  it("cancels reminders when the saved opt-out state is disabled", async () => {
    await persistLocalReminderSettings(
      {
        version: 1,
        remindersEnabled: true,
        reminderTimes: ["09:00", "18:00"],
        replayOnboarding: false,
      },
      {
        notificationsModule: mockNotificationSchedulerModule,
        platformModule: mockPlatformModule,
        platformOs: "android",
        loadSchedulerModule,
      },
    );

    const persistedSettings = await persistLocalReminderSettings(
      {
        version: 1,
        remindersEnabled: false,
        reminderTimes: ["09:00", "18:00"],
        replayOnboarding: false,
      },
      {
        notificationsModule: mockNotificationSchedulerModule,
        platformModule: mockPlatformModule,
        platformOs: "android",
        loadSchedulerModule,
      },
    );

    expect(persistedSettings).toEqual({
      version: 1,
      remindersEnabled: false,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    });
    expect(scheduledRequestsStore.size).toBe(0);
    await expect(loadLocalSettings()).resolves.toEqual(persistedSettings);
  });

  it("stores the onboarding replay request locally until the home route consumes it", async () => {
    await requestStoredOnboardingReplay();

    await expect(loadLocalSettings()).resolves.toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "13:00", "17:00"],
      replayOnboarding: true,
    });
    expect(clearAnonymousSession).not.toHaveBeenCalled();
    expect(clearLocalMoodHistory).not.toHaveBeenCalled();
    expect(joinWorkspace).not.toHaveBeenCalled();
    expect(submitMoodSubmission).not.toHaveBeenCalled();
  });

  it("keeps reminder settings local on Android Expo Go without loading the scheduler module", async () => {
    const loadNotificationsModule = jest.fn(async () => {
      throw new Error("scheduler module should stay lazy in Expo Go");
    });

    const persistedSettings = await persistLocalReminderSettings(
      {
        version: 1,
        remindersEnabled: true,
        reminderTimes: ["09:00", "18:00"],
        replayOnboarding: false,
      },
      {
        platformOs: "android",
        executionEnvironment: "storeClient",
        appOwnership: "expo",
        loadNotificationsModule,
      },
    );

    expect(persistedSettings).toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    });
    await expect(loadLocalSettings()).resolves.toEqual(persistedSettings);
    expect(loadNotificationsModule).not.toHaveBeenCalled();
    expect(scheduledRequestsStore.size).toBe(0);
  });

  it("clears local settings and scheduled reminders when device data is deleted on a supported runtime", async () => {
    Platform.OS = "android";

    await persistLocalReminderSettings(
      {
        version: 1,
        remindersEnabled: true,
        reminderTimes: ["13:00"],
        replayOnboarding: false,
      },
      {
        notificationsModule: mockNotificationSchedulerModule,
        platformModule: mockPlatformModule,
        platformOs: "android",
        loadSchedulerModule,
      },
    );

    await clearLocalDeviceData({
      cancelReminderNotifications: async () => {
        await schedulerModule.cancelScheduledReminderNotifications({
          platformOs: "android",
          notificationsModule: mockNotificationSchedulerModule,
          platformModule: mockPlatformModule,
        });
      },
    });

    await expect(loadLocalSettings()).resolves.toEqual(createDefaultLocalSettings());
    expect(scheduledRequestsStore.size).toBe(0);
    expect(clearLocalMoodHistory).toHaveBeenCalledTimes(1);
    expect(clearAnonymousSession).toHaveBeenCalledTimes(1);
    expect(joinWorkspace).not.toHaveBeenCalled();
    expect(submitMoodSubmission).not.toHaveBeenCalled();
  });

  it("skips reminder cancellation on Android Expo Go when scheduling is unsupported", async () => {
    Platform.OS = "android";
    expoConstants.executionEnvironment = "storeClient";
    expoConstants.appOwnership = "expo";
    const cancelReminderNotifications = jest.fn(async () => undefined);

    await clearLocalDeviceData({
      cancelReminderNotifications,
    });

    expect(cancelReminderNotifications).not.toHaveBeenCalled();
    expect(clearLocalMoodHistory).toHaveBeenCalledTimes(1);
    expect(clearAnonymousSession).toHaveBeenCalledTimes(1);
  });

  it("skips reminder cancellation on web when local notifications are unsupported", async () => {
    const cancelReminderNotifications = jest.fn(async () => undefined);

    await clearLocalDeviceData({
      cancelReminderNotifications,
    });

    expect(cancelReminderNotifications).not.toHaveBeenCalled();
    expect(clearLocalMoodHistory).toHaveBeenCalledTimes(1);
    expect(clearAnonymousSession).toHaveBeenCalledTimes(1);
  });
});

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
