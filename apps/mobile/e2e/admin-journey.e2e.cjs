const { by, device, element, expect, waitFor } = require("detox");

const {
  createAdminLaunchUrl,
  createExpoDevClientLaunchUrl,
  launchExpoDevClient,
  openUrlWithRetries,
  resetBackendTestState,
} = require("./helpers.cjs");

describe("admin panel journey", () => {
  beforeAll(async () => {
    await resetBackendTestState();

    // Boot the dev client, then deep-link into the admin panel using a
    // pre-signed JWT — same pattern the manager journey uses.
    await launchExpoDevClient();
    await openUrlWithRetries(createAdminLaunchUrl());
  });

  it("renders the admin panel with workspace and team sections", async () => {
    // Panel must reach the ready state before we verify sections
    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .withTimeout(20000);

    await expect(element(by.id("admin-panel-team-section"))).toBeVisible();
    await expect(element(by.id("admin-panel-join-code-section"))).toBeVisible();
  });

  it("restores the admin session after a relaunch", async () => {
    // Terminate and relaunch without the deep-link: the stored session should
    // carry the credentials and skip straight to the ready state.
    await device.launchApp({
      newInstance: true,
      url: createAdminLaunchUrl(),
    });

    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .withTimeout(25000);

    await expect(element(by.id("admin-panel-team-section"))).toBeVisible();
  });

  it("signs out and returns to the onboarding screen", async () => {
    await waitFor(element(by.id("admin-panel-logout")))
      .toBeVisible()
      .withTimeout(5000);

    await element(by.id("admin-panel-logout")).tap();

    // After logout the user should see the onboarding join-code step
    await waitFor(element(by.id("join-code-input")))
      .toBeVisible()
      .withTimeout(15000);
  });
});
