import type { SchedulerModule } from "@/features/notifications/scheduler-bridge";
import {
  cancelReminderNotificationsForRuntime,
  syncReminderScheduleForRuntime,
  syncStoredReminderScheduleForRuntime,
} from "@/features/notifications/scheduler-bridge";
import { createDefaultLocalSettings } from "@/features/settings/model";

const mockSyncReminderSchedule = jest.fn();
const mockSyncStoredReminderSchedule = jest.fn();
const mockCancelScheduledReminderNotifications = jest.fn();

const mockSchedulerModule = {
  syncReminderSchedule: (...args: unknown[]) => mockSyncReminderSchedule(...args),
  syncStoredReminderSchedule: (...args: unknown[]) => mockSyncStoredReminderSchedule(...args),
  cancelScheduledReminderNotifications: (...args: unknown[]) =>
    mockCancelScheduledReminderNotifications(...args),
} as unknown as SchedulerModule;

jest.mock("@/features/notifications/scheduler", () => ({
  syncReminderSchedule: (...args: unknown[]) => mockSyncReminderSchedule(...args),
  syncStoredReminderSchedule: (...args: unknown[]) => mockSyncStoredReminderSchedule(...args),
  cancelScheduledReminderNotifications: (...args: unknown[]) =>
    mockCancelScheduledReminderNotifications(...args),
}));

describe("scheduler bridge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultSettings = createDefaultLocalSettings();
  const scheduledResult = {
    status: "scheduled" as const,
    scheduledTimes: ["09:00"],
    activeIdentifiers: ["moodmarble.local-reminder.0900"],
    createdIdentifiers: ["moodmarble.local-reminder.0900"],
    cancelledIdentifiers: [],
  };

  it("syncs reminders on a supported Android runtime", async () => {
    mockSyncReminderSchedule.mockResolvedValue(scheduledResult);

    const result = await syncReminderScheduleForRuntime(defaultSettings, {
      platformOs: "android",
      loadSchedulerModule: async () => mockSchedulerModule,
    });

    expect(mockSyncReminderSchedule).toHaveBeenCalledTimes(1);
    expect(mockSyncReminderSchedule).toHaveBeenCalledWith(
      defaultSettings,
      expect.objectContaining({ platformOs: "android" }),
    );
    expect(result).toEqual(scheduledResult);
  });

  it("syncs stored reminders on a supported iOS runtime", async () => {
    mockSyncStoredReminderSchedule.mockResolvedValue(scheduledResult);

    const result = await syncStoredReminderScheduleForRuntime({
      platformOs: "ios",
      loadSchedulerModule: async () => mockSchedulerModule,
    });

    expect(mockSyncStoredReminderSchedule).toHaveBeenCalledTimes(1);
    expect(mockSyncStoredReminderSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ platformOs: "ios" }),
    );
    expect(result).toEqual(scheduledResult);
  });

  it("cancels reminders on a supported runtime", async () => {
    mockCancelScheduledReminderNotifications.mockResolvedValue(["moodmarble.local-reminder.0900"]);

    const result = await cancelReminderNotificationsForRuntime({
      platformOs: "android",
      loadSchedulerModule: async () => mockSchedulerModule,
    });

    expect(mockCancelScheduledReminderNotifications).toHaveBeenCalledTimes(1);
    expect(mockCancelScheduledReminderNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ platformOs: "android" }),
    );
    expect(result).toEqual(["moodmarble.local-reminder.0900"]);
  });

  it("returns unsupported on web without loading the scheduler module", async () => {
    const loadSchedulerModule = jest.fn(async () => mockSchedulerModule);
    const result = await syncReminderScheduleForRuntime(defaultSettings, {
      platformOs: "web",
      loadSchedulerModule,
    });

    expect(result).toEqual({
      status: "unsupported",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers: [],
    });
    expect(loadSchedulerModule).not.toHaveBeenCalled();
    expect(mockSyncReminderSchedule).not.toHaveBeenCalled();
  });

  it("returns unsupported on Android Expo Go without loading the scheduler module", async () => {
    const loadSchedulerModule = jest.fn(async () => mockSchedulerModule);
    const result = await syncReminderScheduleForRuntime(defaultSettings, {
      platformOs: "android",
      executionEnvironment: "storeClient",
      appOwnership: "expo",
      loadSchedulerModule,
    });

    expect(result).toEqual({
      status: "unsupported",
      scheduledTimes: [],
      activeIdentifiers: [],
      createdIdentifiers: [],
      cancelledIdentifiers: [],
    });
    expect(loadSchedulerModule).not.toHaveBeenCalled();
    expect(mockSyncReminderSchedule).not.toHaveBeenCalled();
  });

  it("returns empty cancellations on unsupported runtimes", async () => {
    const loadSchedulerModule = jest.fn(async () => mockSchedulerModule);
    const result = await cancelReminderNotificationsForRuntime({
      platformOs: "web",
      loadSchedulerModule,
    });

    expect(result).toEqual([]);
    expect(loadSchedulerModule).not.toHaveBeenCalled();
    expect(mockCancelScheduledReminderNotifications).not.toHaveBeenCalled();
  });

  it("throws a clear error when the scheduler module fails to load", async () => {
    await expect(
      syncReminderScheduleForRuntime(defaultSettings, {
        platformOs: "android",
        loadSchedulerModule: async () => {
          throw new Error("Scheduler module is unavailable");
        },
      }),
    ).rejects.toThrow(
      "Failed to load the reminder scheduler module. Reminder notifications cannot be managed.",
    );
  });

  it("surfaces scheduler errors through the existing settings error path", async () => {
    mockSyncReminderSchedule.mockRejectedValue(new Error("Permission denied"));

    await expect(
      syncReminderScheduleForRuntime(defaultSettings, {
        platformOs: "android",
        loadSchedulerModule: async () => mockSchedulerModule,
      }),
    ).rejects.toThrow("Permission denied");
  });
});
