import { clearLocalMoodHistory } from "@/features/history/storage";
import { clearAnonymousSession } from "@/features/onboarding/session";
import { cancelReminderNotificationsForRuntime } from "@/features/notifications/scheduler-bridge";
import { getReminderRuntimeSupport } from "@/features/notifications/platform";

import { clearLocalSettings } from "./storage";

interface ClearLocalDeviceDataOptions {
  cancelReminderNotifications?: () => Promise<unknown>;
}

export async function clearLocalDeviceData(
  options: ClearLocalDeviceDataOptions = {},
): Promise<void> {
  const reminderRuntimeSupport = getReminderRuntimeSupport();

  if (reminderRuntimeSupport.canManageSchedules) {
    try {
      await (options.cancelReminderNotifications ?? cancelReminderNotificationsForRuntime)();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[MoodMarble] Reminder cancellation failed during local data reset: ${message}`);
    }
  }

  await clearWithBestEffort(clearLocalSettings, "local settings");
  await clearWithBestEffort(clearLocalMoodHistory, "local mood history");
  await clearWithBestEffort(clearAnonymousSession, "anonymous session");
}

async function clearWithBestEffort(clear: () => Promise<void>, label: string): Promise<void> {
  try {
    await clear();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[MoodMarble] Failed to clear ${label} during local data reset: ${message}`);
  }
}
