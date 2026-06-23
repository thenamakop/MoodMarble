const { execFileSync } = require("child_process");
const { by, device, element, waitFor } = require("detox");
const jwt = require("jsonwebtoken");

const DEFAULT_MANAGER_JWT_SECRET = "local-dev-jwt-secret-change-me";
const DEFAULT_DEV_CLIENT_SCHEME =
  process.env.DETOX_DEV_CLIENT_SCHEME || "exp+moodmarble";
const DEFAULT_DEV_SERVER_URL =
  process.env.DETOX_DEV_SERVER_URL || "http://127.0.0.1:8081";
const DEFAULT_ANDROID_APP_ID =
  process.env.DETOX_ANDROID_APP_ID || "com.thenamak.MoodMarble";
const DEFAULT_AVD_NAME = process.env.DETOX_AVD_NAME || "Pixel_8";
const BOOTSTRAP_READY_TEST_IDS = [
  "next-onboarding-button",
  "join-code-input",
  "open-settings-button",
  "mood-happy",
  "manager-dashboard-screen",
  "admin-panel-screen",
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
    .withTimeout(20000);
  await element(by.id("team-option-tm_product")).tap();
  await element(by.id("complete-onboarding-button")).tap();

  await waitFor(element(by.id("mood-happy")))
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

  return `${DEFAULT_DEV_CLIENT_SCHEME}://manager?${searchParams.toString()}`;
}

function createAdminLaunchUrl() {
  const adminJwt = jwt.sign(
    {
      workspace_id: "ws_localdemo",
      role: "admin",
    },
    process.env.JWT_SECRET || DEFAULT_MANAGER_JWT_SECRET,
    {
      expiresIn: "30d",
    },
  );

  const searchParams = new URLSearchParams({
    admin_jwt: adminJwt,
    workspace_id: "ws_localdemo",
    workspace_name: "MoodMarble Local Workspace",
  });

  return `${DEFAULT_DEV_CLIENT_SCHEME}://admin?${searchParams.toString()}`;
}

async function launchExpoDevClient() {
  await device.launchApp({
    newInstance: true,
  });
  await device.disableSynchronization();
  await waitForConnectedEmulator();
  await openUrlWithRetries(createExpoDevClientLaunchUrl());
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

    await sleep(500);
  }

  throw new Error(
    `Expo dev client did not open the app runtime within ${timeout}ms.`,
  );
}

async function openUrlWithRetries(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const emulatorSerial = await waitForConnectedEmulator();

      await sleep(750);
      execFileSync(
        "adb",
        ["-s", emulatorSerial, "shell", buildAdbDeepLinkCommand(url)],
        {
          stdio: "pipe",
        },
      );
      return;
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        throw lastError;
      }

      await sleep(1000);
    }
  }
}

function buildAdbDeepLinkCommand(url) {
  return [
    "am start -W -a android.intent.action.VIEW -d",
    quoteForAndroidShell(url),
    DEFAULT_ANDROID_APP_ID,
  ].join(" ");
}

function quoteForAndroidShell(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function waitForConnectedEmulator(timeout = 60000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const emulatorSerial = getConnectedEmulatorSerial(DEFAULT_AVD_NAME);

    if (emulatorSerial) {
      if (isBootCompleted(emulatorSerial)) {
        return emulatorSerial;
      }
    }

    await sleep(1000);
  }

  throw new Error(
    `ADB did not report a booted Android emulator within ${timeout}ms. Start the ${DEFAULT_AVD_NAME} emulator and confirm \`adb devices\` shows it.`,
  );
}

function getConnectedEmulatorSerial(expectedAvdName) {
  const output = execFileSync("adb", ["devices"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [serial, state] = line.split(/\s+/);

    if (serial?.startsWith("emulator-") && state === "device") {
      const avdName = getEmulatorAvdName(serial);

      if (!expectedAvdName || avdName === expectedAvdName) {
        return serial;
      }
    }
  }

  return null;
}

function getEmulatorAvdName(serial) {
  try {
    const output = execFileSync("adb", ["-s", serial, "emu", "avd", "name"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return parseAdbAvdName(output);
  } catch {
    return null;
  }
}

function parseAdbAvdName(output) {
  return (
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && line !== "OK") ?? null
  );
}

function isBootCompleted(serial) {
  try {
    const output = execFileSync(
      "adb",
      ["-s", serial, "shell", "getprop", "sys.boot_completed"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    return output.trim() === "1";
  } catch {
    return false;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  advanceToJoinCode,
  completeAnonymousMemberJourney,
  createAdminLaunchUrl,
  createExpoDevClientLaunchUrl,
  createManagerLaunchUrl,
  buildAdbDeepLinkCommand,
  isVisible,
  launchExpoDevClient,
  openUrlWithRetries,
  resetToOnboardingIfNeeded,
  waitForBootstrappedApp,
};
