import type { LocalSettings } from "@/features/settings/model";
import type { ReminderSchedulerOptions } from "@/features/notifications/scheduler";
import { syncReminderScheduleForRuntime } from "@/features/notifications/scheduler-bridge";

import { saveLocalSettings } from "./storage";

export async function persistLocalReminderSettings(
  settings: LocalSettings,
  syncOptions?: ReminderSchedulerOptions,
): Promise<LocalSettings> {
  const savedSettings = await saveLocalSettings(settings);
  await syncReminderScheduleForRuntime(savedSettings, syncOptions);
  return savedSettings;
}
