const { by, element, expect, waitFor } = require("detox");

const {
  createAdminLaunchUrl,
  launchExpoDevClient,
  openUrlWithRetries,
} = require("./helpers.cjs");

describe("admin panel journey", () => {
  beforeAll(async () => {
    await launchExpoDevClient();
    await openUrlWithRetries(createAdminLaunchUrl());
  });

  it("opens the admin route and renders the scoped panel shell", async () => {
    await waitFor(element(by.id("admin-panel-screen")))
      .toBeVisible()
      .withTimeout(20000);
    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .withTimeout(20000);

    await expect(element(by.id("admin-panel-team-section"))).toBeVisible();
    await expect(element(by.id("admin-panel-join-code-section"))).toBeVisible();
  });
});
