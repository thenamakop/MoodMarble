import {
  clearOnboardingReplayRequest,
  createDefaultLocalSettings,
  DEFAULT_REMINDER_TIMES,
  LOCAL_DATA_DELETION_TARGETS,
  MAX_REMINDER_TIMES,
  normalizeReminderTimes,
  parseLocalSettings,
  requestOnboardingReplay,
  setReminderOptIn,
  setReminderTimes,
} from "@/features/settings/model";

describe("local settings model", () => {
  it("creates an enabled default reminder schedule with spec-defined times", () => {
    expect(createDefaultLocalSettings()).toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: DEFAULT_REMINDER_TIMES,
      replayOnboarding: false,
    });
  });

  it("normalizes reminder times into sorted unique local times", () => {
    expect(normalizeReminderTimes(["21:15", "08:30", "08:30"])).toEqual(["08:30", "21:15"]);
  });

  it("rejects reminder schedules outside the allowed 1 to 3 range", () => {
    expect(() => normalizeReminderTimes([])).toThrow(
      "Reminder settings must include 1 to 3 reminder times.",
    );
    expect(() => normalizeReminderTimes(["08:00", "12:00", "18:00", "21:00"])).toThrow(
      "Reminder settings must include 1 to 3 reminder times.",
    );
    expect(MAX_REMINDER_TIMES).toBe(3);
  });

  it("accepts exactly three reminder times as the supported upper limit", () => {
    expect(normalizeReminderTimes(["21:00", "09:00", "13:30"])).toEqual([
      "09:00",
      "13:30",
      "21:00",
    ]);
  });

  it("rejects invalid local reminder times", () => {
    expect(() => normalizeReminderTimes(["25:00"])).toThrow(
      "Reminder times must use HH:MM 24-hour local format.",
    );
  });

  it("parses stored settings and preserves opt-out state with last times", () => {
    expect(
      parseLocalSettings({
        version: 1,
        remindersEnabled: false,
        reminderTimes: ["18:00", "09:00"],
        replayOnboarding: false,
      }),
    ).toEqual({
      version: 1,
      remindersEnabled: false,
      reminderTimes: ["09:00", "18:00"],
      replayOnboarding: false,
    });
  });

  it("updates reminder times and opt-in status without losing local settings", () => {
    const enabledSettings = setReminderOptIn(createDefaultLocalSettings(), true);
    const updatedSettings = setReminderTimes(enabledSettings, ["20:00", "09:30"]);

    expect(updatedSettings).toEqual({
      version: 1,
      remindersEnabled: true,
      reminderTimes: ["09:30", "20:00"],
      replayOnboarding: false,
    });
  });

  it("toggles onboarding replay as a separate local flag", () => {
    const replayRequested = requestOnboardingReplay(createDefaultLocalSettings());

    expect(replayRequested.replayOnboarding).toBe(true);
    expect(clearOnboardingReplayRequest(replayRequested).replayOnboarding).toBe(false);
  });

  it("defines local deletion targets without touching backend data", () => {
    expect(LOCAL_DATA_DELETION_TARGETS).toEqual([
      "anonymous-session",
      "local-mood-history",
      "local-reminder-settings",
    ]);
  });
});
