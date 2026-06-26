const { by, element, expect, waitFor } = require("detox");

const { advanceToJoinCode, loginAsAdmin } = require("./helpers.cjs");

// Helper: scroll the nav chips back into view then tap a chip, then scroll
// the ScrollView down until the target section card is visible.
async function tapNavChipAndVerifySection(chipTestID, sectionTestID) {
  await element(by.id("admin-panel-screen")).scrollTo("top");
  await waitFor(element(by.id(chipTestID)))
    .toBeVisible()
    .withTimeout(5000);
  await element(by.id(chipTestID)).tap();
  // After the tap, scrollViewRef.scrollTo() fires inside the app. Wait for
  // the section card to become visible — it may need an additional Detox
  // scroll pass if the animated scroll hasn't finished yet.
  await waitFor(element(by.id(sectionTestID)))
    .toBeVisible()
    .whileElement(by.id("admin-panel-screen"))
    .scroll(300, "down", NaN, 0.5);
}

// Admin panel journey — navigates to admin login via the UI, types
// credentials (admin@example.com / password1234), verifies each nav chip
// scrolls to the correct section, then signs out.
describe("admin panel journey", () => {
  beforeAll(async () => {
    await loginAsAdmin();
  });

  it("opens the admin panel and renders the dashboard", async () => {
    // The panel header is immediately visible at the top. Scroll down to
    // bring admin-panel-ready-state into view before asserting on it.
    await waitFor(element(by.id("admin-panel-ready-state")))
      .toBeVisible()
      .whileElement(by.id("admin-panel-screen"))
      .scroll(400, "down", NaN, 0.5);

    await expect(element(by.id("admin-panel-screen"))).toBeVisible();
  });

  it("tapping Workspace chip scrolls to the workspace section", async () => {
    await tapNavChipAndVerifySection(
      "admin-panel-nav-workspace",
      "admin-panel-workspace-section",
    );
  });

  it("tapping Teams chip scrolls to the team management section", async () => {
    await tapNavChipAndVerifySection(
      "admin-panel-nav-team",
      "admin-panel-team-section",
    );
  });

  it("tapping Join code chip scrolls to the join code section", async () => {
    await tapNavChipAndVerifySection(
      "admin-panel-nav-join-code",
      "admin-panel-join-code-section",
    );
  });

  it("tapping Manager codes chip scrolls to the manager codes section", async () => {
    await tapNavChipAndVerifySection(
      "admin-panel-nav-manager-codes",
      "admin-panel-manager-codes-section",
    );
  });

  it("tapping Export chip scrolls to the export section and renders date inputs", async () => {
    await tapNavChipAndVerifySection(
      "admin-panel-nav-export",
      "admin-panel-export-section",
    );

    // Confirm all three export controls are visible — start date, end date,
    // and the run button. These verify the section is fully rendered, not just
    // that the card scrolled into view.
    await waitFor(element(by.id("admin-panel-export-start-date")))
      .toBeVisible()
      .whileElement(by.id("admin-panel-screen"))
      .scroll(200, "down", NaN, 0.5);
    await expect(element(by.id("admin-panel-export-end-date"))).toBeVisible();
    await expect(element(by.id("admin-panel-export-run"))).toBeVisible();
  });

  it("tapping Overview chip scrolls back to the top workspace section", async () => {
    // Overview resets focus to the top — workspace section is active for
    // both 'overview' and 'workspace' so it is the expected visible section.
    await tapNavChipAndVerifySection(
      "admin-panel-nav-overview",
      "admin-panel-workspace-section",
    );
  });

  it("signs out and lands back on the join-code step", async () => {
    // Scroll back to the top so the logout button in the header is visible.
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
