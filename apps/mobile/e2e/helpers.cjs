const { by, device, element, waitFor } = require("detox");
const jwt = require("jsonwebtoken");

const DEFAULT_MANAGER_JWT_SECRET = "local-dev-jwt-secret-change-me";
const DEFAULT_DEV_CLIENT_SCHEME =
  process.env.DETOX_DEV_CLIENT_SCHEME || "exp+moodmarble";
const DEFAULT_DEV_SERVER_URL =
  process.env.DETOX_DEV_SERVER_URL || "http://127.0.0.1:8081";
const BOOTSTRAP_READY_TEST_IDS = [
  "next-onboarding-button",
  "join-code-input",
  "open-settings-button",
  "submit-button",
  "manager-dashboard-screen",
];

async function resetToOnboardingIfNeeded() {
  await launchExpoDevClient();

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
  await advanceToJoinCode();

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

function createExpoDevClientLaunchUrl() {
  const searchParams = new URLSearchParams({
    url: DEFAULT_DEV_SERVER_URL,
    disableOnboarding: "1",
  });

  return `${DEFAULT_DEV_CLIENT_SCHEME}://expo-development-client/?${searchParams.toString()}`;
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

async function launchExpoDevClient() {
  await device.launchApp({
    newInstance: true,
    url: createExpoDevClientLaunchUrl(),
  });
  await device.disableSynchronization();
  await waitForBootstrappedApp();
}

async function advanceToJoinCode() {
  if (await isVisible("join-code-input", 2000)) {
    return;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await isVisible("join-code-input", 1000)) {
      return;
    }

    if (await isVisible("next-onboarding-button", 1000)) {
      await element(by.id("next-onboarding-button")).tap();
      continue;
    }

    if (await isVisible("skip-onboarding-button", 1000)) {
      await element(by.id("skip-onboarding-button")).tap();
      continue;
    }

    break;
  }

  await waitFor(element(by.id("join-code-input")))
    .toBeVisible()
    .withTimeout(10000);
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

async function waitForBootstrappedApp(timeout = 20000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const testID of BOOTSTRAP_READY_TEST_IDS) {
      if (await isVisible(testID, 1500)) {
        return testID;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Expo dev client did not open the app runtime within ${timeout}ms.`,
  );
}

async function openUrlWithRetries(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await sleep(750);
      await device.openURL({ url });
      return;
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        throw lastError;
      }
    }
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  advanceToJoinCode,
  completeAnonymousMemberJourney,
  createExpoDevClientLaunchUrl,
  createManagerLaunchUrl,
  isVisible,
  launchExpoDevClient,
  openUrlWithRetries,
  resetToOnboardingIfNeeded,
  waitForBootstrappedApp,
};
