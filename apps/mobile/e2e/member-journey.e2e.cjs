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
    await scrollTrayDownUntilVisible("tag-#team");
    await element(by.id("tag-#team")).tap();

    // Continue scrolling until submit-button is visible
    await scrollTrayDownUntilVisible("submit-button");
    await element(by.id("submit-button")).tap();

    await waitFor(element(by.id("submission-confirmation")))
      .toBeVisible()
      .withTimeout(45000);
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
