const { by, device, element, waitFor } = require("detox");
const jwt = require("jsonwebtoken");

const DEFAULT_MANAGER_JWT_SECRET = "local-dev-jwt-secret-change-me";

async function resetToOnboardingIfNeeded() {
  await device.launchApp({ newInstance: true });

  if (await isVisible("join-code-input", 4000)) {
    return;
  }

  if (await isVisible("open-settings-button", 4000)) {
    await element(by.id("open-settings-button")).tap();
  }

  if (await isVisible("settings-open-clear-local-data", 4000)) {
    await element(by.id("settings-open-clear-local-data")).tap();
    await waitFor(element(by.id("settings-confirm-clear-local-data")))
      .toBeVisible()
      .withTimeout(4000);
    await element(by.id("settings-confirm-clear-local-data")).tap();
    await waitFor(element(by.id("join-code-input")))
      .toBeVisible()
      .withTimeout(10000);
  }
}

async function completeAnonymousMemberJourney() {
  await waitFor(element(by.id("next-onboarding-button")))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id("next-onboarding-button")).tap();
  await element(by.id("next-onboarding-button")).tap();

  await waitFor(element(by.id("join-code-input")))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id("join-code-input")).replaceText("ABC123");
  await element(by.id("join-workspace-button")).tap();

  await waitFor(element(by.id("team-option-tm_product")))
    .toBeVisible()
    .withTimeout(15000);
  await element(by.id("team-option-tm_product")).tap();
  await element(by.id("complete-onboarding-button")).tap();

  await waitFor(element(by.id("submit-button")))
    .toBeVisible()
    .withTimeout(15000);
}

function createManagerLaunchUrl() {
  const managerJwt = jwt.sign(
    {
      workspace_id: "ws_localdemo",
      team_id: "tm_product",
      role: "manager",
    },
    process.env.JWT_SECRET || DEFAULT_MANAGER_JWT_SECRET,
    {
      expiresIn: "30d",
    },
  );

  const searchParams = new URLSearchParams({
    date: "2026-06-22",
    manager_jwt: managerJwt,
    manager_teams: "tm_product:Product",
    start_date: "2026-06-16",
    team_id: "tm_product",
    team_name: "Product",
  });

  return `moodmarble://manager?${searchParams.toString()}`;
}

async function isVisible(testID, timeout = 2500) {
  try {
    await waitFor(element(by.id(testID)))
      .toBeVisible()
      .withTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  completeAnonymousMemberJourney,
  createManagerLaunchUrl,
  isVisible,
  resetToOnboardingIfNeeded,
};
