import { z } from "zod";

export const LOCAL_SETTINGS_VERSION = 1;
export const MAX_REMINDER_TIMES = 3;
export const DEFAULT_REMINDER_TIMES: ReminderTime[] = ["09:30", "13:00", "17:00"];

const ReminderTimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Reminder times must use HH:MM 24-hour local format.");

const RawLocalSettingsSchema = z.object({
  version: z.literal(LOCAL_SETTINGS_VERSION),
  remindersEnabled: z.boolean(),
  reminderTimes: z.array(ReminderTimeSchema),
  replayOnboarding: z.boolean(),
});

export const LocalDataDeletionTargetSchema = z.enum([
  "anonymous-session",
  "local-mood-history",
  "local-reminder-settings",
]);

export type ReminderTime = z.infer<typeof ReminderTimeSchema>;
export type LocalDataDeletionTarget = z.infer<typeof LocalDataDeletionTargetSchema>;

export interface LocalSettings {
  version: typeof LOCAL_SETTINGS_VERSION;
  remindersEnabled: boolean;
  reminderTimes: ReminderTime[];
  replayOnboarding: boolean;
}

export const LOCAL_DATA_DELETION_TARGETS: LocalDataDeletionTarget[] = [
  "anonymous-session",
  "local-mood-history",
  "local-reminder-settings",
];

export function createDefaultLocalSettings(): LocalSettings {
  return {
    version: LOCAL_SETTINGS_VERSION,
    remindersEnabled: true,
    reminderTimes: DEFAULT_REMINDER_TIMES,
    replayOnboarding: false,
  };
}

export function parseLocalSettings(value: unknown): LocalSettings {
  const parsedSettings = RawLocalSettingsSchema.parse(value);

  return {
    ...parsedSettings,
    reminderTimes: normalizeReminderTimes(parsedSettings.reminderTimes),
  };
}

export function normalizeReminderTimes(reminderTimes: string[]): ReminderTime[] {
  const uniqueTimes = Array.from(new Set(reminderTimes.map((time) => time.trim())));

  if (uniqueTimes.length < 1 || uniqueTimes.length > MAX_REMINDER_TIMES) {
    throw new Error("Reminder settings must include 1 to 3 reminder times.");
  }

  for (const reminderTime of uniqueTimes) {
    ReminderTimeSchema.parse(reminderTime);
  }

  return uniqueTimes
    .sort((leftTime, rightTime) => leftTime.localeCompare(rightTime))
    .map((time) => time as ReminderTime);
}

export function setReminderTimes(settings: LocalSettings, reminderTimes: string[]): LocalSettings {
  return {
    ...settings,
    reminderTimes: normalizeReminderTimes(reminderTimes),
  };
}

export function setReminderOptIn(
  settings: LocalSettings,
  remindersEnabled: boolean,
): LocalSettings {
  return {
    ...settings,
    remindersEnabled,
  };
}

export function requestOnboardingReplay(settings: LocalSettings): LocalSettings {
  return {
    ...settings,
    replayOnboarding: true,
  };
}

export function clearOnboardingReplayRequest(settings: LocalSettings): LocalSettings {
  return {
    ...settings,
    replayOnboarding: false,
  };
}
