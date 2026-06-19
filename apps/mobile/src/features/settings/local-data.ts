import { clearLocalMoodHistory } from "@/features/history/storage";
import { clearAnonymousSession } from "@/features/onboarding/session";
import { cancelScheduledReminderNotifications } from "@/features/notifications/scheduler";

import { clearLocalSettings } from "./storage";

export async function clearLocalDeviceData(): Promise<void> {
  await cancelScheduledReminderNotifications();
  await clearLocalSettings();
  await clearLocalMoodHistory();
  await clearAnonymousSession();
}
