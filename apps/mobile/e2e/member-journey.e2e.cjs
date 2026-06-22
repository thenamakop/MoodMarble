const { by, device, element, expect, waitFor } = require("detox");

const {
  completeAnonymousMemberJourney,
  resetToOnboardingIfNeeded,
} = require("./helpers.cjs");

describe("member onboarding journey", () => {
  beforeAll(async () => {
    await resetToOnboardingIfNeeded();
  });

  it("completes onboarding, submits a mood, and opens history", async () => {
    await completeAnonymousMemberJourney();

    await element(by.id("mood-happy")).tap();
    await element(by.id("tag-team")).tap();
    await element(by.id("submit-button")).tap();

    await waitFor(element(by.id("submission-confirmation")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("submission-confirmation")).tap();

    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id("open-history-button")).tap();

    await expect(element(by.id("history-panel-timeline"))).toBeVisible();
    await element(by.id("history-view-calendar")).tap();
    await expect(element(by.id("history-panel-calendar"))).toBeVisible();
    await element(by.id("history-return-home")).tap();
    await expect(element(by.id("submit-button"))).toBeVisible();
  });
});
