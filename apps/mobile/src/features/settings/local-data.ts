import { clearLocalMoodHistory } from "@/features/history/storage";
import { clearAnonymousSession } from "@/features/onboarding/session";
import { cancelScheduledReminderNotifications } from "@/features/notifications/scheduler";

import { clearLocalSettings } from "./storage";

interface ClearLocalDeviceDataOptions {
  cancelReminderNotifications?: () => Promise<unknown>;
}

export async function clearLocalDeviceData(
  options: ClearLocalDeviceDataOptions = {},
): Promise<void> {
  await (
    options.cancelReminderNotifications ?? cancelScheduledReminderNotifications
  )();
  await clearLocalSettings();
  await clearLocalMoodHistory();
  await clearAnonymousSession();
}
