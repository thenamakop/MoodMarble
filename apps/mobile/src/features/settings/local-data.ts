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
    await (
      options.cancelReminderNotifications ??
      cancelReminderNotificationsForRuntime
    )();
  }
  await clearLocalSettings();
  await clearLocalMoodHistory();
  await clearAnonymousSession();
}
