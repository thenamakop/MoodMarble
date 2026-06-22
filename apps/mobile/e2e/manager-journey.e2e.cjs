const { by, device, element, expect, waitFor } = require("detox");

const { createManagerLaunchUrl } = require("./helpers.cjs");

describe("manager dashboard journey", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      url: createManagerLaunchUrl(),
    });
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
  });
});
