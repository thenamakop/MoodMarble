const { by, device, element, expect, waitFor } = require("detox");

const {
  launchExpoDevClient,
  loginAsAdmin,
} = require("./helpers.cjs");

describe("admin panel journey", () => {
  beforeAll(async () => {
    await launchExpoDevClient();
  });

  it("authenticates as admin via the UI and renders the panel", async () => {
    await loginAsAdmin();
    
    // Verify panel sections
    await expect(element(by.id("admin-panel-team-section"))).toBeVisible();
    await expect(element(by.id("admin-panel-join-code-section"))).toBeVisible();
  });

  it("restores the admin session after a relaunch", async () => {
    // Terminate and relaunch to test session persistence
    await device.launchApp({ newInstance: true });
    
    // Should bypass login and go straight to the ready state
    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .withTimeout(20000);
      
    await expect(element(by.id("admin-panel-team-section"))).toBeVisible();
  });

  it("signs out and returns to onboarding", async () => {
    await waitFor(element(by.id("admin-panel-logout")))
      .toBeVisible()
      .withTimeout(5000);
      
    await element(by.id("admin-panel-logout")).tap();
    
    // Should return to the join code screen
    await waitFor(element(by.id("join-code-input")))
      .toBeVisible()
      .withTimeout(10000);
  });
});
