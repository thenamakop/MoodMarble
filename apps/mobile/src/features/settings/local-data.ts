import { clearLocalMoodHistory } from "@/features/history/storage";
import { clearAnonymousSession } from "@/features/onboarding/session";
import { supportsLocalNotifications } from "@/features/notifications/platform";
import { cancelScheduledReminderNotifications } from "@/features/notifications/scheduler";

import { clearLocalSettings } from "./storage";

interface ClearLocalDeviceDataOptions {
  cancelReminderNotifications?: () => Promise<unknown>;
}

export async function clearLocalDeviceData(
  options: ClearLocalDeviceDataOptions = {},
): Promise<void> {
  if (supportsLocalNotifications()) {
    await (
      options.cancelReminderNotifications ??
      cancelScheduledReminderNotifications
    )();
  }
  await clearLocalSettings();
  await clearLocalMoodHistory();
  await clearAnonymousSession();
}
