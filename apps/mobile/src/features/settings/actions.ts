import type { LocalSettings } from "@/features/settings/model";
import { syncReminderSchedule } from "@/features/notifications/scheduler";

import { saveLocalSettings } from "./storage";

export async function persistLocalReminderSettings(
  settings: LocalSettings,
  syncOptions?: Parameters<typeof syncReminderSchedule>[1],
): Promise<LocalSettings> {
  const savedSettings = await saveLocalSettings(settings);
  await syncReminderSchedule(savedSettings, syncOptions);
  return savedSettings;
}
