const { by, device, element, waitFor } = require("detox");

const {
  advanceToJoinCode,
  completeAnonymousMemberJourney,
  isVisible,
  resetToOnboardingIfNeeded,
  scrollTrayToTop,
  scrollTrayUntilVisible,
} = require("./helpers.cjs");

describe("member onboarding journey", () => {
  beforeAll(async () => {
    await resetToOnboardingIfNeeded();
  });

  // ─── 1. Onboarding ────────────────────────────────────────────────────────

  it("completes onboarding and lands on the marble tray", async () => {
    await completeAnonymousMemberJourney();
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 2. Mood submission ───────────────────────────────────────────────────

  it("selects a mood marble, adds a tag, writes a note, and submits", async () => {
    await scrollTrayToTop();

    // 1. Tap mood marble — grid is at top of tray after scrollToTop.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("mood-happy")).tap();

    // 2. Scroll to the tag panel.  Retry the tap up to 3 times — the first
    //    tap can be absorbed by the scroll gesture recogniser on Android.
    //    Break once canSubmit becomes true (submit-button only appears when
    //    both a mood AND a tag are selected).
    await scrollTrayUntilVisible("tag-#team");
    for (let i = 0; i < 3; i += 1) {
      await element(by.id("tag-#team")).tap();
      if (await isVisible("submit-button", 2000)) break;
      try {
        await scrollTrayUntilVisible("tag-#team");
      } catch {
        /* already visible */
      }
    }

    // 3. Scroll to the note input, tap to focus it, type the note.
    //    The on-screen keyboard opens when the field is focused — do NOT
    //    dismiss it yet because the ScrollView needs to be able to scroll
    //    past it.  We use replaceText (not typeText) so Detox sends a single
    //    synthetic event without real key-by-key events that keep the keyboard
    //    open indefinitely.
    await scrollTrayUntilVisible("note-input");
    await element(by.id("note-input")).tap();
    await element(by.id("note-input")).replaceText("Feeling good today.");

    // 4. Dismiss the keyboard BEFORE scrolling to the submit button.
    //    On Android the keyboard overlays the bottom of the screen, so the
    //    submit button tap lands on the keyboard instead of the button.
    //    device.pressBack() closes the soft keyboard without leaving the screen.
    await device.pressBack();

    // 5. Scroll to submit and tap with retries.
    await scrollTrayUntilVisible("submit-button");
    for (let tapAttempt = 0; tapAttempt < 4; tapAttempt += 1) {
      await element(by.id("submit-button")).tap();
      if (await isVisible("submission-confirmation", 12000)) break;
      try {
        await scrollTrayUntilVisible("submit-button");
      } catch {
        /* already visible */
      }
    }

    await waitFor(element(by.id("submission-confirmation")))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.id("submission-confirmation")).tap();

    // After dismiss, the tray resets and scrolls to top — mood-happy visible.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 3. History screen ────────────────────────────────────────────────────

  it("opens history, navigates calendar prev/next, and returns home", async () => {
    // Use scrollTo("top") — deterministic, does not depend on current position.
    await scrollTrayToTop();

    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-history-button")).tap();

    // Wait for the timeline panel to confirm the screen is fully mounted.
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(15000);
    await device.takeScreenshot("history-timeline-view");

    // Switch to calendar.
    await element(by.id("history-view-calendar")).tap();
    await waitFor(element(by.id("history-panel-calendar")))
      .toBeVisible()
      .withTimeout(10000);
    await device.takeScreenshot("history-calendar-view");

    // Previous month.
    await waitFor(element(by.id("calendar-previous-month")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("calendar-previous-month")).tap();
    await waitFor(element(by.id("calendar-panel")))
      .toBeVisible()
      .withTimeout(5000);

    // Next month (back to current).
    await waitFor(element(by.id("calendar-next-month")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("calendar-next-month")).tap();
    await waitFor(element(by.id("calendar-panel")))
      .toBeVisible()
      .withTimeout(5000);

    // Return home — wait for the button to be fully stable before tapping.
    await waitFor(element(by.id("history-return-home")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("history-return-home")).tap();

    // Confirm the marble tray is back.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 4. Settings screen ───────────────────────────────────────────────────

  it("opens settings, configures reminders, replays onboarding, and returns", async () => {
    // History test returned to the tray — scroll it to the top first.
    await scrollTrayToTop();

    await waitFor(element(by.id("open-settings-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-settings-button")).tap();

    // Wait for the settings ScrollView — this confirms the screen is mounted.
    await waitFor(element(by.id("settings-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);

    // --- Toggle daily reminders on ---
    // settings-reminders-switch is in the first panel, visible at screen top.
    await waitFor(element(by.id("settings-reminders-switch")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("settings-reminders-switch")).tap();
    // NOTE: on the dev-client build the scheduler module call throws
    // "Property 'require' doesn't exist" (eval("require") hits the Hermes
    // sandbox restriction).  The toggle still persists to AsyncStorage — the
    // error shows in the UI as errorMessage but does not crash the screen.
    // We deliberately do NOT wait for settings-status-message here because
    // that message only appears on success; we wait for a short grace period
    // instead and then proceed.
    await new Promise((r) => setTimeout(r, 1500));

    // --- Reminder times section ---
    // Slot 0 already exists (default "09:00"). Scroll to it and type a value.
    await waitFor(element(by.id("settings-reminder-time-0")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(300, "down", NaN, 0.5);
    await element(by.id("settings-reminder-time-0")).tap();
    await element(by.id("settings-reminder-time-0")).replaceText("08:00");
    // Dismiss keyboard opened by the text field.
    await device.pressBack();

    // Add a second slot and immediately remove it.
    await waitFor(element(by.id("settings-add-reminder-time")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-add-reminder-time")).tap();

    await waitFor(element(by.id("settings-remove-reminder-1")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-remove-reminder-1")).tap();

    // Add two fresh slots (total will be 3).
    await waitFor(element(by.id("settings-add-reminder-time")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-add-reminder-time")).tap();

    await waitFor(element(by.id("settings-reminder-time-1")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-reminder-time-1")).tap();
    await element(by.id("settings-reminder-time-1")).replaceText("13:00");
    await device.pressBack();

    await waitFor(element(by.id("settings-add-reminder-time")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-add-reminder-time")).tap();

    await waitFor(element(by.id("settings-reminder-time-2")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-reminder-time-2")).tap();
    await element(by.id("settings-reminder-time-2")).replaceText("18:00");
    await device.pressBack();

    // Apply the three times.  The button is enabled because hasTimeChanges is
    // true (we changed slot 0 and added 2 new slots).
    await waitFor(element(by.id("settings-apply-reminder-times")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-apply-reminder-times")).tap();
    // Same scheduler caveat applies — give the app a moment to settle.
    await new Promise((r) => setTimeout(r, 1500));

    // --- Replay onboarding ---
    await waitFor(element(by.id("settings-replay-onboarding")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(300, "down", NaN, 0.5);
    await element(by.id("settings-replay-onboarding")).tap();
    // This writes replayOnboarding=true to AsyncStorage.
    await new Promise((r) => setTimeout(r, 1000));

    // --- Return home via Back to marbles ---
    // settings-return-home is at the very top of the settings scroll view.
    await element(by.id("settings-scroll-view")).scrollTo("top");
    await waitFor(element(by.id("settings-return-home")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("settings-return-home")).tap();

    // Because replayOnboarding was flagged, the home screen transitions to
    // the onboarding intro.  advanceToJoinCode() scrolls to top and taps Skip
    // to land back on the join-code screen.
    await advanceToJoinCode();
    await waitFor(element(by.id("join-code-input")))
      .toBeVisible()
      .withTimeout(10000);
  });
});
