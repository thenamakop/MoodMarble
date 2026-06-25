const { by, element, expect, waitFor } = require("detox");

const { advanceToJoinCode, loginAsAdmin } = require("./helpers.cjs");

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
    // Scroll the panel back to the top — after the first test the ScrollView
    // may have scrolled down past the header, putting the logout button out of view.
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
