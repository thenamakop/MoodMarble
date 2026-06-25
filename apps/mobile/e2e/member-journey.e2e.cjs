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
    // mood-happy should already be visible from test 1 — no scroll needed.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("mood-happy")).tap();

    // Scroll to the tag panel. Retry the tap up to 3 times — the tap can be
    // absorbed by the scroll gesture recogniser on Android.
    // submit-button only becomes enabled when both a mood AND a tag are set.
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

    // Scroll to the submit button and tap it ONCE.
    // The submission confirmation auto-dismisses after ~1.6s — do NOT retry
    // the tap: the confirmation overlay covers the full screen with zIndex 10,
    // and a second tap hits the overlay (not the button), causing Detox to
    // throw "tap intercepted by another view".
    await scrollTrayUntilVisible("submit-button");
    await element(by.id("submit-button")).tap();

    // Wait for the confirmation overlay to appear and then auto-dismiss.
    // The confirmation disappears after 1.6s and the tray resets — wait for
    // mood-happy to confirm we are back on the tray with a clean state.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(20000);
  });

  // ─── 3. History screen ────────────────────────────────────────────────────

  it("opens history, screenshots both views, and returns home", async () => {
    // mood-happy visible means tray is fully mounted. Scroll to top to expose
    // the header buttons (open-history-button / open-settings-button).
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
    await scrollTrayToTop();

    await waitFor(element(by.id("open-history-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-history-button")).tap();

    // Timeline view — confirm it rendered, take a screenshot.
    await waitFor(element(by.id("history-panel-timeline")))
      .toBeVisible()
      .withTimeout(15000);
    await device.takeScreenshot("history-timeline-view");

    // Switch to calendar view — confirm it rendered, take a screenshot.
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
    // mood-happy visible means tray is fully mounted. Scroll to top.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(10000);
    await scrollTrayToTop();

    await waitFor(element(by.id("open-settings-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("open-settings-button")).tap();

    // Wait for the settings scroll view — confirms the screen is mounted.
    await waitFor(element(by.id("settings-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);

    // Scroll down to the Replay onboarding button and tap it.
    // onRequestOnboardingReplay calls requestStoredOnboardingReplay() +
    // refreshNativeHomeState() — the home screen re-reads the flag, sets
    // replaySession, and renders OnboardingScreen in-place (no navigation).
    await waitFor(element(by.id("settings-replay-onboarding")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll-view"))
      .scroll(400, "down", NaN, 0.5);
    await element(by.id("settings-replay-onboarding")).tap();

    // The onboarding scroll view replaces the settings screen immediately.
    // Scroll to top so the Skip button is guaranteed in the viewport, then
    // tap it — Skip calls handleCompleteIntro(replaySession) which restores
    // the member session and navigates back to the marble tray.
    await waitFor(element(by.id("onboarding-scroll-view")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("onboarding-scroll-view")).scrollTo("top");
    await waitFor(element(by.id("skip-onboarding-button")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("skip-onboarding-button")).tap();

    // Session was preserved — land back on the marble tray.
    await waitFor(element(by.id("mood-happy")))
      .toBeVisible()
      .withTimeout(15000);
  });
});
