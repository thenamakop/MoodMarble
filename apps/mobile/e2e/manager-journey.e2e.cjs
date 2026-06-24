const { by, device, element, expect, waitFor } = require("detox");

const {
  createManagerLaunchUrl,
  launchExpoDevClient,
  openUrlWithRetries,
  resetBackendTestState,
} = require("./helpers.cjs");

describe("manager dashboard journey", () => {
  beforeAll(async () => {
    // Step 0: ensure the database has the demo workspace seeded
    await resetBackendTestState();
    
    // Step 1: boot a clean instance and wait for the JS bridge to be ready
    await launchExpoDevClient();
    // Step 2: deliver the deep-link after the runtime is live
    await openUrlWithRetries(createManagerLaunchUrl());
  });

  it("opens the manager route and renders the dashboard view", async () => {
    await waitFor(element(by.id("manager-dashboard-screen")))
      .toBeVisible()
      .withTimeout(20000);

    await waitFor(element(by.id("manager-dashboard-ready-state")))
      .toBeVisible()
      .withTimeout(20000);

    await expect(element(by.id("manager-dashboard-date-picker"))).toBeVisible();
    await expect(
      element(by.id("manager-dashboard-team-selector")),
    ).toBeVisible();
    await expect(element(by.id("manager-dashboard-screen"))).toBeVisible();
  });
});
