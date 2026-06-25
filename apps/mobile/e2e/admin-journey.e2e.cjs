const { by, element, expect, waitFor } = require("detox");

const { loginAsAdmin } = require("./helpers.cjs");

// Admin panel journey — navigates to admin login via the UI, types
// credentials (admin@example.com / password1234), and verifies the panel.
describe("admin panel journey", () => {
  beforeAll(async () => {
    await loginAsAdmin();
  });

  it("opens the admin panel and renders the dashboard", async () => {
    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .withTimeout(45000);

    await expect(element(by.id("admin-panel-screen"))).toBeVisible();
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
