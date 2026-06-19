import type { LocalSettings } from "@/features/settings/model";
import type { ReminderSchedulerOptions } from "@/features/notifications/scheduler";

import { saveLocalSettings } from "./storage";

export async function persistLocalReminderSettings(
  settings: LocalSettings,
  syncOptions?: ReminderSchedulerOptions,
): Promise<LocalSettings> {
  const savedSettings = await saveLocalSettings(settings);
  const {
    syncReminderSchedule,
  } = require("@/features/notifications/scheduler");
  await syncReminderSchedule(savedSettings, syncOptions);
  return savedSettings;
}
