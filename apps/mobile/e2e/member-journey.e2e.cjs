const { by, element, waitFor } = require("detox");

const {
  completeAnonymousMemberJourney,
  isVisible,
  resetToOnboardingIfNeeded,
} = require("./helpers.cjs");

async function scrollTrayDownUntilVisible(testID) {
  await waitFor(element(by.id("marble-tray-scroll-view")))
    .toBeVisible()
    .withTimeout(10000);

  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id("marble-tray-scroll-view"))
    .scroll(180, "down", NaN, 0.85);
}

describe("member onboarding journey", () => {
  beforeAll(async () => {
    await resetToOnboardingIfNeeded();
  });

  it("completes onboarding, submits a mood, and reaches history and settings", async () => {
    await completeAnonymousMemberJourney();

    // Tap a mood marble — mood-happy is always visible at screen top
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id("mood-happy")).tap();

    // Scroll the tray content downward until the tag chip is visible.
    // Tap with retry — Detox taps inside ScrollViews on Android can be
    // swallowed by the gesture recogniser.
    await scrollTrayDownUntilVisible("tag-#team");
    for (let i = 0; i < 3; i += 1) {
      await element(by.id("tag-#team")).tap();
      // If the tag is now selected, the submit button should appear
      if (await isVisible("submit-button", 3000)) break;
      try {
        await scrollTrayDownUntilVisible("tag-#team");
      } catch {
        /* already visible */
      }
    }

    // Continue scrolling until submit-button is visible, then tap with
    // retries — Detox's tap injection inside a ScrollView on Android can be
    // swallowed by the scroll gesture recogniser.
    await scrollTrayDownUntilVisible("submit-button");

    for (let tapAttempt = 0; tapAttempt < 4; tapAttempt += 1) {
      await element(by.id("submit-button")).tap();

      if (await isVisible("submission-confirmation", 12000)) {
        break;
      }

      // The tap was swallowed — scroll the button back into view and retry
      try {
        await scrollTrayDownUntilVisible("submit-button");
      } catch {
        // already visible
      }
    }

    await waitFor(element(by.id("submission-confirmation")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("submission-confirmation")).tap();

    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id("open-history-button")).tap();

    // History screen: timeline view first
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(15000);

    // Switch to calendar view
    await element(by.id("history-view-calendar")).tap();
    await waitFor(element(by.id("history-panel-calendar")))
      .toBeVisible()
      .withTimeout(10000);

    // Return home — mood-happy should be visible again on the tray
    await element(by.id("history-return-home")).tap();
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id("open-settings-button")).tap();
    await waitFor(element(by.id("settings-return-home")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id("settings-return-home")).tap();
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });
});
