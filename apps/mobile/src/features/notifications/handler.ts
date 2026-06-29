import { useEffect } from "react";
import { useRouter } from "expo-router";

import { loadNativeModule } from "./native-module";
import { getReminderRuntimeSupport } from "./platform";

export interface NotificationResponse {
  notification: {
    request: {
      content: {
        data?: Record<string, unknown> | null;
      };
    };
  };
}

export interface NotificationSubscription {
  remove: () => void;
}

export interface NotificationHandlerModule {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => NotificationSubscription;
  addNotificationResponseReceivedListener: (
    callback: (response: NotificationResponse) => void,
  ) => NotificationSubscription;
}

export interface UseNotificationHandlerOptions {
  loadNotificationsModule?: () => NotificationHandlerModule;
}

export function useNotificationHandler(
  options: UseNotificationHandlerOptions = {},
) {
  const router = useRouter();

  useEffect(() => {
    const runtimeSupport = getReminderRuntimeSupport();

    if (
      !runtimeSupport.supportsLocalNotifications ||
      !runtimeSupport.canManageSchedules
    ) {
      return;
    }

    let handlerSubscription: NotificationSubscription | null = null;
    let responseSubscription: NotificationSubscription | null = null;

    async function setup() {
      try {
        const notificationsModule =
          options.loadNotificationsModule?.() ??
          loadNativeModule<NotificationHandlerModule>("expo-notifications");

        handlerSubscription = notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });

        responseSubscription =
          notificationsModule.addNotificationResponseReceivedListener(
            (response) => {
              const source =
                response?.notification?.request?.content?.data?.source;

              if (source === "moodmarble-local-reminder") {
                router.replace("/");
              }
            },
          );
      } catch {
        // Ignore setup failures in unsupported runtimes.
      }
    }

    void setup();

    return () => {
      handlerSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [router]);
}
