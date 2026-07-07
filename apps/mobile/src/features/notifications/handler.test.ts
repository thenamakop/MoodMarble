import { renderHook } from "@testing-library/react-native";

import {
  type NotificationHandlerModule,
  type NotificationResponse,
  useNotificationHandler,
} from "@/features/notifications/handler";
import { getReminderRuntimeSupport } from "@/features/notifications/platform";
import { useRouter } from "expo-router";

jest.mock("@/features/notifications/platform", () => ({
  getReminderRuntimeSupport: jest.fn(() => ({
    supportsLocalNotifications: true,
    canManageSchedules: true,
    requiresDevelopmentBuild: false,
    notice: null,
  })),
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
}));

describe("useNotificationHandler", () => {
  const mockSetNotificationHandler = jest.fn(
    () => ({ remove: jest.fn() }) as { remove: () => void },
  );
  const mockAddNotificationResponseReceivedListener = jest.fn(
    (_callback: (response: NotificationResponse) => void) =>
      ({ remove: jest.fn() }) as { remove: () => void },
  );

  beforeEach(() => {
    mockSetNotificationHandler.mockClear();
    mockAddNotificationResponseReceivedListener.mockClear();
    jest.mocked(getReminderRuntimeSupport).mockReturnValue({
      supportsLocalNotifications: true,
      canManageSchedules: true,
      requiresDevelopmentBuild: false,
      notice: null,
    });
  });

  function createMockNotificationsModule(): NotificationHandlerModule {
    return {
      setNotificationHandler: mockSetNotificationHandler,
      addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
    };
  }

  it("sets the notification handler and registers a response listener", async () => {
    renderHook(() =>
      useNotificationHandler({
        loadNotificationsModule: createMockNotificationsModule,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSetNotificationHandler).toHaveBeenCalledTimes(1);
    expect(mockSetNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        handleNotification: expect.any(Function),
      }),
    );
    expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
  });

  it("does not set up notifications on unsupported runtimes", async () => {
    jest.mocked(getReminderRuntimeSupport).mockReturnValue({
      supportsLocalNotifications: false,
      canManageSchedules: false,
      requiresDevelopmentBuild: false,
      notice: null,
    });

    renderHook(() =>
      useNotificationHandler({
        loadNotificationsModule: createMockNotificationsModule,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSetNotificationHandler).not.toHaveBeenCalled();
    expect(mockAddNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });

  it("navigates home when a MoodMarble reminder notification is tapped", async () => {
    const routerReplace = jest.fn();
    jest.mocked(useRouter).mockReturnValue({
      replace: routerReplace,
    } as unknown as ReturnType<typeof useRouter>);

    let responseCallback: ((response: NotificationResponse) => void) | null = null;
    mockAddNotificationResponseReceivedListener.mockImplementation((callback) => {
      responseCallback = callback;
      return { remove: jest.fn() };
    });

    renderHook(() =>
      useNotificationHandler({
        loadNotificationsModule: createMockNotificationsModule,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(responseCallback).not.toBeNull();
    responseCallback!({
      notification: {
        request: {
          content: {
            data: { source: "moodmarble-local-reminder" },
          },
        },
      },
    });

    expect(routerReplace).toHaveBeenCalledWith("/");
  });

  it("does not navigate home for notifications from other sources", async () => {
    const routerReplace = jest.fn();
    jest.mocked(useRouter).mockReturnValue({
      replace: routerReplace,
    } as unknown as ReturnType<typeof useRouter>);

    let responseCallback: ((response: NotificationResponse) => void) | null = null;
    mockAddNotificationResponseReceivedListener.mockImplementation((callback) => {
      responseCallback = callback;
      return { remove: jest.fn() };
    });

    renderHook(() =>
      useNotificationHandler({
        loadNotificationsModule: createMockNotificationsModule,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(responseCallback).not.toBeNull();
    responseCallback!({
      notification: {
        request: {
          content: {
            data: { source: "other-source" },
          },
        },
      },
    });

    expect(routerReplace).not.toHaveBeenCalled();
  });
});
