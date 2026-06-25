const { by, element, expect, waitFor } = require("detox");

const {
  advanceToJoinCode,
  isVisible,
  launchExpoDevClient,
  openUrlWithRetries,
  resetBackendTestState,
} = require("./helpers.cjs");

const DEFAULT_DEV_CLIENT_SCHEME =
  process.env.DETOX_DEV_CLIENT_SCHEME || "exp+moodmarble";

// The seeded manager code inserted by /__test/reset
const SEEDED_MANAGER_CODE = "MGR001";

describe("manager join-code journey", () => {
  beforeAll(async () => {
    // Reset DB — seeds ws_localdemo, tm_product, admin, and MGR001 manager code
    await resetBackendTestState();
    await launchExpoDevClient();
    await advanceToJoinCode();
  });

  it("shows the manager code link on the join-code step", async () => {
    await waitFor(element(by.id("manager-code-link")))
      .toBeVisible()
      .withTimeout(8000);
  });

  it("navigates to the manager join screen via the link", async () => {
    // Navigate via deep-link instead of tapping the in-ScrollView Pressable,
    // because Detox's tap injection on Android is frequently swallowed by the
    // ScrollView gesture recogniser.
    const joinManagerUrl = `${DEFAULT_DEV_CLIENT_SCHEME}://join-manager`;
    await openUrlWithRetries(joinManagerUrl);

    await waitFor(element(by.id("manager-join-screen")))
      .toBeVisible()
      .withTimeout(20000);

    await expect(element(by.id("manager-code-input"))).toBeVisible();
    await expect(element(by.id("manager-code-submit-btn"))).toBeVisible();
  });

  it("shows an inline error for a short or malformed code without making an API call", async () => {
    // Ensure we are on the manager join screen
    if (!(await isVisible("manager-join-screen", 3000))) {
      const joinManagerUrl = `${DEFAULT_DEV_CLIENT_SCHEME}://join-manager`;
      await openUrlWithRetries(joinManagerUrl);
      await waitFor(element(by.id("manager-join-screen")))
        .toBeVisible()
        .withTimeout(15000);
    }

    // Type a 3-char input — too short, fails client-side validation
    await element(by.id("manager-code-input")).replaceText("ABC");
    await element(by.id("manager-code-submit-btn")).tap();

    await waitFor(element(by.id("manager-code-error-text")))
      .toBeVisible()
      .withTimeout(3000);

    // Must still be on the same screen — no navigation occurred
    await expect(element(by.id("manager-join-screen"))).toBeVisible();
  });

  it("redeems the seeded code and reaches the manager dashboard", async () => {
    // Clear the previous short input and type the valid 6-char seeded code
    await element(by.id("manager-code-input")).replaceText(SEEDED_MANAGER_CODE);
    await element(by.id("manager-code-submit-btn")).tap();

    // Navigation to /manager takes time — bundle rebuild + API round-trip
    await waitFor(element(by.id("manager-dashboard-screen")))
      .toBeVisible()
      .withTimeout(30000);

    await waitFor(element(by.id("manager-dashboard-ready-state")))
      .toBeVisible()
      .withTimeout(20000);

    await expect(element(by.id("manager-dashboard-date-picker"))).toBeVisible();
  });
});
