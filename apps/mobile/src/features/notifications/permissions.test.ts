import {
  getNotificationPermissionStatus,
  normalizePermissionStatus,
  requestNotificationPermission,
  type NotificationPermissionModule,
} from "@/features/notifications/permissions";
import {
  getReminderRuntimeSupport,
  type ReminderRuntimeSupport,
} from "@/features/notifications/platform";

jest.mock("@/features/notifications/platform", () => ({
  getReminderRuntimeSupport: jest.fn(() => ({
    supportsLocalNotifications: true,
    canManageSchedules: true,
    requiresDevelopmentBuild: false,
    notice: null,
  })),
}));

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();

function createMockNotificationsModule(): Promise<NotificationPermissionModule> {
  return Promise.resolve({
    getPermissionsAsync: mockGetPermissionsAsync,
    requestPermissionsAsync: mockRequestPermissionsAsync,
  });
}

describe("notification permissions", () => {
  beforeEach(() => {
    mockGetPermissionsAsync.mockReset();
    mockRequestPermissionsAsync.mockReset();
    jest.mocked(getReminderRuntimeSupport).mockReturnValue({
      supportsLocalNotifications: true,
      canManageSchedules: true,
      requiresDevelopmentBuild: false,
      notice: null,
    });
  });

  describe("normalizePermissionStatus", () => {
    it("returns granted for granted status", () => {
      expect(normalizePermissionStatus("granted")).toEqual({
        status: "granted",
        canAskAgain: true,
      });
    });

    it("returns denied with canAskAgain false by default", () => {
      expect(normalizePermissionStatus("denied")).toEqual({
        status: "denied",
        canAskAgain: false,
      });
    });

    it("preserves canAskAgain when provided", () => {
      expect(normalizePermissionStatus("denied", true)).toEqual({
        status: "denied",
        canAskAgain: true,
      });
    });

    it("returns undetermined for unknown status", () => {
      expect(normalizePermissionStatus("unknown")).toEqual({
        status: "undetermined",
        canAskAgain: true,
      });
    });
  });

  describe("getNotificationPermissionStatus", () => {
    it("returns unsupported when the runtime cannot manage schedules", async () => {
      jest.mocked(getReminderRuntimeSupport).mockReturnValue({
        supportsLocalNotifications: false,
        canManageSchedules: false,
        requiresDevelopmentBuild: false,
        notice: null,
      });

      await expect(
        getNotificationPermissionStatus({
          loadNotificationsModule: createMockNotificationsModule,
        }),
      ).resolves.toBe("unsupported");
      expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
    });

    it("reads the current permission status from expo-notifications", async () => {
      mockGetPermissionsAsync.mockResolvedValue({
        status: "granted",
        canAskAgain: true,
      });

      await expect(
        getNotificationPermissionStatus({
          loadNotificationsModule: createMockNotificationsModule,
        }),
      ).resolves.toBe("granted");
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it("normalizes denied status", async () => {
      mockGetPermissionsAsync.mockResolvedValue({
        status: "denied",
        canAskAgain: false,
      });

      await expect(
        getNotificationPermissionStatus({
          loadNotificationsModule: createMockNotificationsModule,
        }),
      ).resolves.toBe("denied");
    });

    it("uses the injected module loader when provided", async () => {
      const loadNotificationsModule = jest.fn(async () => ({
        getPermissionsAsync: jest.fn(async () => ({
          status: "granted" as const,
          canAskAgain: true,
        })),
        requestPermissionsAsync: jest.fn(),
      }));

      await expect(
        getNotificationPermissionStatus({
          loadNotificationsModule:
            loadNotificationsModule as unknown as () => Promise<NotificationPermissionModule>,
        }),
      ).resolves.toBe("granted");
      expect(loadNotificationsModule).toHaveBeenCalledTimes(1);
      expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe("requestNotificationPermission", () => {
    it("returns unsupported when the runtime cannot manage schedules", async () => {
      jest.mocked(getReminderRuntimeSupport).mockReturnValue({
        supportsLocalNotifications: true,
        canManageSchedules: false,
        requiresDevelopmentBuild: true,
        notice: null,
      });

      await expect(
        requestNotificationPermission({
          loadNotificationsModule: createMockNotificationsModule,
        }),
      ).resolves.toBe("unsupported");
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    it("requests permission and returns the normalized status", async () => {
      mockRequestPermissionsAsync.mockResolvedValue({
        status: "granted",
        canAskAgain: true,
      });

      await expect(
        requestNotificationPermission({
          loadNotificationsModule: createMockNotificationsModule,
        }),
      ).resolves.toBe("granted");
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it("uses the injected module loader when provided", async () => {
      const loadNotificationsModule = jest.fn(async () => ({
        getPermissionsAsync: jest.fn(),
        requestPermissionsAsync: jest.fn(async () => ({
          status: "undetermined" as const,
          canAskAgain: true,
        })),
      }));

      await expect(
        requestNotificationPermission({
          loadNotificationsModule:
            loadNotificationsModule as unknown as () => Promise<NotificationPermissionModule>,
        }),
      ).resolves.toBe("undetermined");
      expect(loadNotificationsModule).toHaveBeenCalledTimes(1);
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });
  });
});
