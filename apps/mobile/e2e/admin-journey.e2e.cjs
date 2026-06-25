const { by, element, expect, waitFor } = require("detox");

const {
  loginAsAdmin,
  relaunchExpoDevClient,
  resetToOnboardingIfNeeded,
} = require("./helpers.cjs");

// Admin authentication is email/password only — no join code, no deep-link.
// loginAsAdmin() drives the UI: admin-entry-link → admin-login-root →
// email/password → submit → waits for admin-panel-ready-state.
describe("admin panel journey", () => {
  it("logs in via the admin login screen and renders the panel", async () => {
    // loginAsAdmin() calls resetToOnboardingIfNeeded() → resetBackendTestState()
    // internally, so the DB is seeded before the UI flow begins.
    await loginAsAdmin();

    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .withTimeout(25000);

    await expect(element(by.id("admin-panel-team-section"))).toBeVisible();
    await expect(element(by.id("admin-panel-join-code-section"))).toBeVisible();
  });

  it("restores the admin session after a cold relaunch", async () => {
    // Previous test logged in via UI → saveAdminSession() was called → SecureStore
    // has the token. Relaunching without a URL should restore and skip login.
    await relaunchExpoDevClient();

    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .withTimeout(30000);

    await expect(element(by.id("admin-panel-team-section"))).toBeVisible();
  });

  it("signs out and lands back on the join-code step", async () => {
    await waitFor(element(by.id("admin-panel-logout")))
      .toBeVisible()
      .withTimeout(8000);

    await element(by.id("admin-panel-logout")).tap();

    await waitFor(element(by.id("join-code-input")))
      .toBeVisible()
      .withTimeout(15000);
  });
});
