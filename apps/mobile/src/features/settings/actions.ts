import type { LocalSettings } from "@/features/settings/model";
import {
  syncReminderScheduleForRuntime,
  type SyncReminderScheduleForRuntimeOptions,
} from "@/features/notifications/scheduler-bridge";

import { saveLocalSettings } from "./storage";

export async function persistLocalReminderSettings(
  settings: LocalSettings,
  syncOptions?: SyncReminderScheduleForRuntimeOptions,
): Promise<LocalSettings> {
  const savedSettings = await saveLocalSettings(settings);
  await syncReminderScheduleForRuntime(savedSettings, syncOptions);
  return savedSettings;
}
