const { by, element, waitFor } = require("detox");

const {
  completeAnonymousMemberJourney,
  isVisible,
  resetToOnboardingIfNeeded,
  scrollTrayUntilVisible,
  scrollTrayUntilVisibleUp,
} = require("./helpers.cjs");

describe("member onboarding journey", () => {
  beforeAll(async () => {
    await resetToOnboardingIfNeeded();
  });

  it("completes onboarding and lands on the marble tray", async () => {
    await completeAnonymousMemberJourney();
    // mood-happy is the first marble in the grid — confirms tray is ready.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  it("selects a mood marble, adds a tag, writes a note, and submits", async () => {
    // 1. Tap a mood marble — always at top of screen, no scroll needed.
    await element(by.id("mood-happy")).tap();

    // 2. Scroll down to the tag panel and tap a tag with retry.
    await scrollTrayUntilVisible("tag-#team");
    for (let i = 0; i < 3; i += 1) {
      await element(by.id("tag-#team")).tap();
      if (await isVisible("note-input", 2000)) break;
      try {
        await scrollTrayUntilVisible("tag-#team");
      } catch {
        /* already visible */
      }
    }

    // 3. Scroll to the note input and type a test note.
    await scrollTrayUntilVisible("note-input");
    await element(by.id("note-input")).replaceText("Feeling good today.");

    // 4. Scroll to the submit button and tap with retries.
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
    // Tap the confirmation banner to dismiss it.
    await element(by.id("submission-confirmation")).tap();
  });

  it("opens the history screen, switches views, and returns home", async () => {
    // After submission the tray resets — scroll up to bring the header
    // buttons (View history / Settings) back into view.
    await scrollTrayUntilVisibleUp("open-history-button");

    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-history-button")).tap();

    // History screen opens in timeline view.
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(15000);

    // Switch to calendar view and confirm it rendered.
    await element(by.id("history-view-calendar")).tap();
    await waitFor(element(by.id("history-panel-calendar")))
      .toBeVisible()
      .withTimeout(10000);

    // Switch back to timeline to confirm bidirectional navigation works.
    await element(by.id("history-view-timeline")).tap();
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(10000);

    // Return home — mood-happy confirms the tray is visible again.
    await element(by.id("history-return-home")).tap();
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  it("opens the settings screen and returns home", async () => {
    // Scroll up to bring the header buttons back into view again.
    await scrollTrayUntilVisibleUp("open-settings-button");

    await waitFor(element(by.id("open-settings-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-settings-button")).tap();

    // Settings screen: scroll down to confirm return-home button is reachable.
    await waitFor(element(by.id("settings-return-home")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(300, "up", NaN, 0.5);

    await element(by.id("settings-return-home")).tap();

    // Back on the tray — mood-happy should be visible.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });
});
