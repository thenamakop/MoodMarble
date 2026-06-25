const { by, device, element, waitFor } = require("detox");

const {
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
      .withTimeout(15000);
  });

  // ─── 2. Mood submission ───────────────────────────────────────────────────

  it("selects a mood marble and submits", async () => {
    // mood-happy is the first marble in the grid — its visibility confirms the
    // tray is fully mounted and the marble grid is rendered.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(8000);

    // Tap the stressed marble. canSubmit becomes true immediately (no tag needed).
    await element(by.id("mood-stressed")).tap();

    // Scroll to the tag panel and tap workload + deadlines.
    await scrollTrayUntilVisible("tag-#workload");
    await element(by.id("tag-#workload")).tap();
    await scrollTrayUntilVisible("tag-#deadlines");
    await element(by.id("tag-#deadlines")).tap();

    // submit-button is always in the DOM (just disabled until canSubmit).
    // Scroll down to bring it into view and tap it once.
    // Do NOT retry — the SubmissionConfirmation overlay (absoluteFill,
    // zIndex 10) appears for ~1.6s and any retry tap hits the overlay.
    await scrollTrayUntilVisible("submit-button");
    await element(by.id("submit-button")).tap();

    // Wait 2.5s — longer than the 1.6s auto-dismiss + spring animation.
    // The confirmation disappears and the scroll view stays mounted at the
    // bottom. After the wait we scroll to top to prepare for the next test.
    await new Promise((r) => setTimeout(r, 2500));
    await scrollTrayToTop();

    // mood-happy re-appears at the top confirming a clean reset.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(8000);
  });

  // ─── 3. History screen ────────────────────────────────────────────────────

  it("opens history, screenshots both views, and returns home", async () => {
    // Tray is at the top from the previous test — open-history-button visible.
    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-history-button")).tap();

    // Timeline view — wait for it and screenshot.
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(15000);
    await device.takeScreenshot("history-timeline-view");

    // Switch to calendar view — wait for it and screenshot.
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

    // mood-happy confirms the tray is back.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 4. Settings — replay onboarding then skip back to marbles ────────────

  it("opens settings, triggers onboarding replay, and skips back to marbles", async () => {
    // Scroll tray to top to expose the Settings button.
    await scrollTrayToTop();

    await waitFor(element(by.id("open-settings-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-settings-button")).tap();

    // Wait for the settings scroll view to confirm screen is mounted.
    await waitFor(element(by.id("settings-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);

    // Scroll to the Replay onboarding button and tap it.
    // onRequestOnboardingReplay → requestStoredOnboardingReplay() +
    // refreshNativeHomeState() re-reads the flag, sets replaySession, and
    // renders OnboardingScreen in-place (no router navigation).
    await waitFor(element(by.id("settings-replay-onboarding")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(400, "down", NaN, 0.5);
    await element(by.id("settings-replay-onboarding")).tap();

    // Onboarding screen replaces settings inline. Scroll to top and tap Skip.
    // Skip calls handleCompleteIntro(replaySession) → restores member session
    // → marble tray re-renders.
    await waitFor(element(by.id("onboarding-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("onboarding-scroll-view")).scrollTo("top");
    await waitFor(element(by.id("skip-onboarding-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("skip-onboarding-button")).tap();

    // Session preserved — back on the marble tray.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(15000);
  });
});
