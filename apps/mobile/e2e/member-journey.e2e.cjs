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
    // mood-happy is the first marble in the grid — confirms tray is ready.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 2. Mood submission ───────────────────────────────────────────────────

  it("selects a mood marble, adds a tag, writes a note, and submits", async () => {
    // Ensure we start from the top — previous test left us at top, but
    // explicitly scroll just in case.
    await scrollTrayToTop();

    // 1. Tap a mood marble — grid is visible after scrolling to top.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("mood-happy")).tap();

    // 2. Scroll down to the tag panel and tap a tag.
    //    The scroll itself may still be settling — give it a moment, then
    //    retry the tap up to 3 times checking accessibilityState.selected.
    await scrollTrayUntilVisible("tag-#team");
    for (let i = 0; i < 3; i += 1) {
      await element(by.id("tag-#team")).tap();
      // A selected tag has accessibilityState.selected = true. We confirm
      // selection by checking whether submit-button became enabled (canSubmit
      // depends on selectedMood + tag). If submit-button is still not visible
      // after 2s the tap was swallowed — scroll it back and retry.
      if (await isVisible("submit-button", 2000)) break;
      try {
        await scrollTrayUntilVisible("tag-#team");
      } catch {
        /* already visible */
      }
    }

    // 3. Scroll to the note input and type a test note.
    await scrollTrayUntilVisible("note-input");
    // Tap the field first to focus it, then replace text.
    await element(by.id("note-input")).tap();
    await element(by.id("note-input")).replaceText("Feeling good today.");

    // 4. Scroll to the submit button and tap with retries.
    //    We scroll to a slightly lower y-fraction (0.75) so the button is
    //    clear of any keyboard or bottom inset that could swallow the tap.
    await waitFor(element(by.id("submit-button")))
      .toBeVisible()
      .whileElement(by.id("marble-tray-scroll-view"))
      .scroll(200, "down", NaN, 0.75);

    for (let tapAttempt = 0; tapAttempt < 4; tapAttempt += 1) {
      await element(by.id("submit-button")).tap();
      if (await isVisible("submission-confirmation", 12000)) break;
      try {
        await waitFor(element(by.id("submit-button")))
          .toBeVisible()
          .whileElement(by.id("marble-tray-scroll-view"))
          .scroll(200, "down", NaN, 0.75);
      } catch {
        /* already visible */
      }
    }

    await waitFor(element(by.id("submission-confirmation")))
      .toBeVisible()
      .withTimeout(15000);

    // Tap the confirmation banner to dismiss it.
    await element(by.id("submission-confirmation")).tap();

    // After dismiss the tray resets — mood-happy should be visible again.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 3. History screen ────────────────────────────────────────────────────

  it("opens history, navigates calendar, and returns home", async () => {
    // Scroll to top so the header buttons are in view.
    await scrollTrayToTop();

    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-history-button")).tap();

    // History opens in timeline view — wait for its panel.
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(15000);

    // Take a screenshot of the timeline view.
    await device.takeScreenshot("history-timeline-view");

    // Switch to calendar view and confirm it rendered.
    await element(by.id("history-view-calendar")).tap();
    await waitFor(element(by.id("history-panel-calendar")))
      .toBeVisible()
      .withTimeout(10000);

    // Take a screenshot of the calendar view.
    await device.takeScreenshot("history-calendar-view");

    // Navigate previous month and confirm the panel is still visible.
    await element(by.id("calendar-previous-month")).tap();
    await waitFor(element(by.id("calendar-panel")))
      .toBeVisible()
      .withTimeout(5000);

    // Navigate next month (back to current) and confirm.
    await element(by.id("calendar-next-month")).tap();
    await waitFor(element(by.id("calendar-panel")))
      .toBeVisible()
      .withTimeout(5000);

    // Return home — mood-happy confirms the tray is visible again.
    await element(by.id("history-return-home")).tap();
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 4. Settings screen ───────────────────────────────────────────────────

  it("opens settings, configures reminders, replays onboarding, and returns", async () => {
    // Scroll to top so the header buttons are in view.
    await scrollTrayToTop();

    await waitFor(element(by.id("open-settings-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-settings-button")).tap();

    // Settings screen — wait for the scroll view to appear.
    await waitFor(element(by.id("settings-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);

    // --- Turn on daily reminders ---
    await waitFor(element(by.id("settings-reminders-switch")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("settings-reminders-switch")).tap();
    // Wait for status message to confirm the toggle was processed.
    await waitFor(element(by.id("settings-status-message")))
      .toBeVisible()
      .withTimeout(8000);

    // --- Reminder times section ---
    // Settings opens with 1 time already set (index 0). Type a new value.
    await waitFor(element(by.id("settings-reminder-time-0")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(300, "down", NaN, 0.5);
    await element(by.id("settings-reminder-time-0")).replaceText("08:00");

    // Add a second time slot.
    await waitFor(element(by.id("settings-add-reminder-time")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-add-reminder-time")).tap();

    // Remove the newly added slot (index 1).
    await waitFor(element(by.id("settings-remove-reminder-1")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-remove-reminder-1")).tap();

    // Add two fresh slots back (index 1 then index 2).
    await waitFor(element(by.id("settings-add-reminder-time")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-add-reminder-time")).tap();

    await waitFor(element(by.id("settings-reminder-time-1")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-reminder-time-1")).replaceText("13:00");

    await waitFor(element(by.id("settings-add-reminder-time")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-add-reminder-time")).tap();

    await waitFor(element(by.id("settings-reminder-time-2")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-reminder-time-2")).replaceText("18:00");

    // Apply the three times.
    await waitFor(element(by.id("settings-apply-reminder-times")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(200, "down", NaN, 0.5);
    await element(by.id("settings-apply-reminder-times")).tap();
    await waitFor(element(by.id("settings-status-message")))
      .toBeVisible()
      .withTimeout(8000);

    // --- Replay onboarding ---
    await waitFor(element(by.id("settings-replay-onboarding")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(300, "down", NaN, 0.5);
    await element(by.id("settings-replay-onboarding")).tap();
    // Status message confirms the replay was queued.
    await waitFor(element(by.id("settings-status-message")))
      .toBeVisible()
      .withTimeout(8000);

    // --- Return home via Back to marbles ---
    // settings-return-home is at the TOP of the settings scroll view.
    await element(by.id("settings-scroll-view")).scrollTo("top");
    await waitFor(element(by.id("settings-return-home")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("settings-return-home")).tap();

    // Onboarding replay was queued — the app lands on the intro slides.
    // Tap Skip to get back to the join-code screen, then verify it.
    await advanceToJoinCode();
    await waitFor(element(by.id("join-code-input")))
      .toBeVisible()
      .withTimeout(10000);
  });
});
