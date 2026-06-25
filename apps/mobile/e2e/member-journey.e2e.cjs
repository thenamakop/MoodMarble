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

  it("selects a mood marble, adds a tag, and submits", async () => {
    await scrollTrayToTop();

    // Tap a mood marble — grid is visible at top after scrollToTop.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("mood-happy")).tap();

    // Scroll to the tag panel and tap a tag.  Retry up to 3 times — the first
    // tap can be absorbed by the scroll gesture recogniser on Android.
    // submit-button only becomes enabled once both a mood AND a tag are set.
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

    // Scroll to the submit button and tap it with retries.
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

    // Dismiss the confirmation banner.
    await element(by.id("submission-confirmation")).tap();

    // After dismiss the tray resets — mood-happy confirms we're back.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 3. History screen ────────────────────────────────────────────────────

  it("opens history, screenshots both views, and returns home", async () => {
    // Scroll tray to top to expose header buttons.
    await scrollTrayToTop();

    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-history-button")).tap();

    // Timeline view — screenshot it.
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(15000);
    await device.takeScreenshot("history-timeline-view");

    // Switch to calendar view — screenshot it.
    await waitFor(element(by.id("history-view-calendar")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("history-view-calendar")).tap();
    await waitFor(element(by.id("history-panel-calendar")))
      .toBeVisible()
      .withTimeout(10000);
    await device.takeScreenshot("history-calendar-view");

    // Return home.
    await waitFor(element(by.id("history-return-home")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("history-return-home")).tap();

    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 4. Settings — replay onboarding and skip back to marbles ─────────────

  it("opens settings, triggers onboarding replay, and skips back to marbles", async () => {
    // Scroll tray to top to expose header buttons.
    await scrollTrayToTop();

    await waitFor(element(by.id("open-settings-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-settings-button")).tap();

    // Wait for the settings scroll view to confirm the screen is mounted.
    await waitFor(element(by.id("settings-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);

    // Scroll down to the Replay onboarding button and tap it.
    await waitFor(element(by.id("settings-replay-onboarding")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(400, "down", NaN, 0.5);
    await element(by.id("settings-replay-onboarding")).tap();

    // Give AsyncStorage a moment to persist replayOnboarding = true.
    await new Promise((r) => setTimeout(r, 800));

    // Tap Back to marbles — settings-return-home is at the very top.
    await element(by.id("settings-scroll-view")).scrollTo("top");
    await waitFor(element(by.id("settings-return-home")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("settings-return-home")).tap();

    // Settings is rendered inline inside (tabs)/index.tsx via setActiveNativeScreen.
    // onRequestOnboardingReplay calls requestStoredOnboardingReplay() + refreshNativeHomeState()
    // which re-reads replayOnboarding=true, sets replaySession, and re-renders
    // the OnboardingScreen in-place — no router navigation.
    // Tapping Skip calls handleCompleteIntro() which, because replaySession is
    // set, calls onSessionReady(replaySession) and restores the member session,
    // landing back on the marble tray.
    await waitFor(element(by.id("onboarding-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("onboarding-scroll-view")).scrollTo("top");
    await waitFor(element(by.id("skip-onboarding-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("skip-onboarding-button")).tap();

    // Should land back on the marble tray with the session intact.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(15000);
  });
});
