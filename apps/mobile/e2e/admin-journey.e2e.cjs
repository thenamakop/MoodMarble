const { by, element, expect, waitFor } = require("detox");

const { advanceToJoinCode, loginAsAdmin } = require("./helpers.cjs");

// Admin panel journey — navigates to admin login via the UI, types
// credentials (admin@example.com / password1234), and verifies the panel.
describe("admin panel journey", () => {
  beforeAll(async () => {
    await loginAsAdmin();
  });

  it("opens the admin panel and renders the dashboard", async () => {
    // The panel header is immediately visible. Scroll down to bring
    // admin-panel-ready-state into view before asserting on it.
    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .whileElement(by.id("admin-panel-screen"))
      .scroll(400, "down", NaN, 0.5);

    await expect(element(by.id("admin-panel-screen"))).toBeVisible();
  });

  it("signs out and lands back on the join-code step", async () => {
    // Scroll back to the top so the logout button in the header is fully visible.
    await element(by.id("admin-panel-screen")).scrollTo("top");

    await waitFor(element(by.id("admin-panel-logout")))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id("admin-panel-logout")).tap();

    // Logout calls router.replace("/") which lands on the home screen.
    // With no member session the home screen renders the onboarding intro —
    // skip past it to reach the join code input.
    await advanceToJoinCode();
  });
});
