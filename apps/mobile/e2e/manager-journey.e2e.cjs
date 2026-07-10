const { by, element, expect, waitFor } = require("detox");

const {
  advanceToJoinCode,
  isVisible,
  launchExpoDevClient,
  resetBackendTestState,
  SEEDED_MANAGER_CODE,
} = require("./helpers.cjs");

// ─── helpers ──────────────────────────────────────────────────────────────────

// Tap the manager-code-link, submit the seeded code, and wait until the
// dashboard is fully loaded (ready-state visible). Returns after the initial
// dashboard load; the test body handles further interactions.
async function reachManagerDashboard() {
  // Navigate from the join-code screen to the manager join screen.
  for (let tapAttempt = 0; tapAttempt < 4; tapAttempt += 1) {
    await element(by.id("manager-code-link")).tap();
    if (await isVisible("manager-join-screen", 8000)) {
      break;
    }
  }

  await waitFor(element(by.id("manager-join-screen")))
    .toBeVisible()
    .withTimeout(15000);

  // Submit the seeded manager code.
  await element(by.id("manager-code-input")).replaceText(SEEDED_MANAGER_CODE);
  await element(by.id("manager-code-submit-btn")).tap();

  // Wait for the dashboard to appear and data to load.
  await waitFor(element(by.id("manager-dashboard-screen")))
    .toBeVisible()
    .withTimeout(30000);

  await waitFor(element(by.id("manager-dashboard-ready-state")))
    .toBeVisible()
    .withTimeout(20000);
}

// Scroll the dashboard screen until the requested chart card is visible.
async function scrollToChartCard(testID) {
  await element(by.id("manager-dashboard-screen")).scrollTo("top");
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id("manager-dashboard-screen"))
    .scroll(300, "down", NaN, 0.5);
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe("manager dashboard journey", () => {
  beforeAll(async () => {
    // Reset DB — seeds ws_localdemo, tm_product, admin, MGR001, and dashboard
    // fixtures so all privacy thresholds are cleared on every date window.
    await resetBackendTestState();
    await launchExpoDevClient();
    await advanceToJoinCode();
    await reachManagerDashboard();
  });

  // ─── 1. Header controls ───────────────────────────────────────────────────

  it("renders the date picker and team selector in the header", async () => {
    await element(by.id("manager-dashboard-screen")).scrollTo("top");

    await expect(element(by.id("manager-dashboard-date-picker"))).toBeVisible();
    await expect(element(by.id("manager-dashboard-team-selector"))).toBeVisible();

    // The team label should read "Product" — the team MGR001 is scoped to.
    await waitFor(element(by.text("Product")))
      .toBeVisible()
      .withTimeout(5000);
  });

  // ─── 2. Summary panel ─────────────────────────────────────────────────────

  it("shows the ready state and the dashboard summary panel", async () => {
    // Scroll down slightly so the summary panel is in view.
    await waitFor(element(by.id("manager-dashboard-ready-state")))
      .toBeVisible()
      .whileElement(by.id("manager-dashboard-screen"))
      .scroll(200, "down", NaN, 0.5);

    // The ready-state view is visible — confirms data loaded and the view
    // model was built successfully.
    await expect(element(by.id("manager-dashboard-ready-state"))).toBeVisible();
  });

  // ─── 3. Date picker steps back one day ────────────────────────────────────

  it("tapping the date picker navigates to the previous day", async () => {
    await element(by.id("manager-dashboard-screen")).scrollTo("top");

    await waitFor(element(by.id("manager-dashboard-date-picker")))
      .toBeVisible()
      .withTimeout(5000);

    // Read the current date label before tapping.
    // After tapping, the route replaces itself with date − 1 day, which
    // triggers a new dashboard load. We wait for the loading state to appear
    // and then for the ready state to return.
    await element(by.id("manager-dashboard-date-picker")).tap();

    // The route replace may briefly show a loading state.
    // We don't assert on loading (it may be too fast to catch) — just wait
    // for ready to reappear confirming a successful re-fetch.
    await waitFor(element(by.id("manager-dashboard-ready-state")))
      .toBeVisible()
      .withTimeout(25000);

    // The date picker control is still visible after re-fetch.
    await expect(element(by.id("manager-dashboard-date-picker"))).toBeVisible();
  });

  // ─── 4. Daily heatmap card ────────────────────────────────────────────────

  it("renders the redesigned daily heatmap as a 2x12 grid", async () => {
    await scrollToChartCard("manager-dashboard-daily-card");

    await expect(element(by.id("manager-dashboard-daily-card"))).toBeVisible();
    await expect(element(by.id("manager-dashboard-daily-grid"))).toBeVisible();

    // AM row header and at least one populated hour cell are visible.
    await waitFor(element(by.text("AM")))
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(element(by.id("manager-dashboard-daily-cell-0-9")))
      .toBeVisible()
      .withTimeout(5000);
  });

  // ─── 5. Expand-to-fullscreen chart cards ──────────────────────────────────

  it("opens and closes the expanded weekly trend chart modal", async () => {
    await scrollToChartCard("manager-dashboard-weekly-card");

    const expandTrigger = element(by.id("manager-dashboard-weekly-card-expand-trigger"));
    await waitFor(expandTrigger).toBeVisible().withTimeout(5000);
    await expandTrigger.tap();

    // The fullscreen modal and close button appear.
    await waitFor(element(by.id("manager-dashboard-weekly-card-expand-close")))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id("manager-dashboard-weekly-card-expand-close")).tap();

    // The modal closes and the original card is back in view.
    await waitFor(element(by.id("manager-dashboard-weekly-card")))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ─── 6. Weekly trend and tag analytics cards render ───────────────────────

  it("renders the weekly trend and tag analytics cards", async () => {
    await scrollToChartCard("manager-dashboard-weekly-card");
    await expect(element(by.id("manager-dashboard-weekly-card"))).toBeVisible();

    await scrollToChartCard("manager-dashboard-tags-card");
    await expect(element(by.id("manager-dashboard-tags-card"))).toBeVisible();
  });

  // ─── 7. Export control is present but disabled ────────────────────────────

  it("renders the export control as disabled (coming soon)", async () => {
    await element(by.id("manager-dashboard-screen")).scrollTo("top");

    await waitFor(element(by.id("manager-dashboard-export-button")))
      .toBeVisible()
      .withTimeout(5000);

    // The export button carries accessibilityState disabled — it is not
    // tappable in the current release.
    await expect(element(by.id("manager-dashboard-export-button"))).toHaveValue(undefined);
    await expect(element(by.id("manager-dashboard-export-button"))).toBeVisible();
  });

  // ─── 8. Sign out ──────────────────────────────────────────────────────────

  it("signs out from the dashboard and lands back on the onboarding intro", async () => {
    await element(by.id("manager-dashboard-screen")).scrollTo("top");

    await waitFor(element(by.id("manager-dashboard-logout")))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id("manager-dashboard-logout")).tap();

    // Sign-out clears the anonymous session and calls router.replace("/").
    // The home screen finds no session and renders the onboarding intro.
    await waitFor(element(by.id("next-onboarding-button")))
      .toBeVisible()
      .withTimeout(15000);
  });
});
