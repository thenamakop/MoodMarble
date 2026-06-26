const { execFileSync } = require("child_process");
const { by, device, element, waitFor } = require("detox");

const DEFAULT_DEV_CLIENT_SCHEME =
  process.env.DETOX_DEV_CLIENT_SCHEME || "exp+moodmarble";
const DEFAULT_DEV_SERVER_URL =
  process.env.DETOX_DEV_SERVER_URL || "http://127.0.0.1:8081";
const DEFAULT_BACKEND_URL = DEFAULT_DEV_SERVER_URL.replace(/:8081$/, ":3000");
const DEFAULT_ANDROID_DEV_SERVER_URL = DEFAULT_DEV_SERVER_URL.replace(
  "127.0.0.1",
  "10.0.2.2",
).replace("localhost", "10.0.2.2");
const DEFAULT_ANDROID_APP_ID =
  process.env.DETOX_ANDROID_APP_ID || "com.thenamak.MoodMarble";
const DEFAULT_AVD_NAME = process.env.DETOX_AVD_NAME || "Pixel_8";
const METRO_PORT = 8081;
const BACKEND_PORT = 3000;
const BOOTSTRAP_READY_TEST_IDS = [
  "next-onboarding-button",
  "join-code-input",
  "open-settings-button",
  "mood-happy",
  "manager-dashboard-screen",
  "admin-panel-screen",
];

// The manager code seeded by /__test/reset. Defined here so test files and
// the seed script share a single source of truth.
const SEEDED_MANAGER_CODE = "MGR001";

async function resetBackendTestState() {
  const backendUrl =
    DEFAULT_DEV_SERVER_URL.replace(/:8081$/, ":3000") + "/__test/reset";
  try {
    const response = await fetch(backendUrl, { method: "POST" });
    if (!response.ok) {
      console.warn(
        `[DEBUG] Failed to reset backend state. Status: ${response.status}`,
      );
    } else {
      console.log("[DEBUG] Backend test state reset successfully.");
    }
  } catch (error) {
    console.warn("[DEBUG] Could not reach backend to reset test state.", error);
  }
}

async function resetToOnboardingIfNeeded() {
  await resetBackendTestState();
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
  } else if (await isVisible("settings-scroll-view", 2000)) {
    // If we're on the settings screen but clear local data is off-screen,
    // we need to scroll down.
    try {
      await waitFor(element(by.id("settings-open-clear-local-data")))
        .toBeVisible()
        .whileElement(by.id("settings-scroll-view"))
        .scroll(300, "down", NaN, 0.85);

      await element(by.id("settings-open-clear-local-data")).tap();
      await waitFor(element(by.id("settings-confirm-clear-local-data")))
        .toBeVisible()
        .whileElement(by.id("settings-scroll-view"))
        .scroll(300, "down", NaN, 0.85);
      await element(by.id("settings-confirm-clear-local-data")).tap();
    } catch {
      // Ignore if it fails, maybe it's already cleared or something else
    }
  }

  // Whether we cleared a session or the app started fresh on intro slides,
  // skip through to the join code screen.
  await advanceToJoinCode();
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

  // Wait for the marble tray — mood-happy is always at the top of the grid.
  await waitFor(element(by.id("mood-happy")))
    .toBeVisible()
    .withTimeout(15000);
}

// Scrolls the marble tray downward until testID is visible on screen.
async function scrollTrayUntilVisible(testID) {
  await waitFor(element(by.id("marble-tray-scroll-view")))
    .toBeVisible()
    .withTimeout(10000);
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id("marble-tray-scroll-view"))
    .scroll(180, "down", NaN, 0.85);
}

// Waits for the marble tray to be on screen, then scrolls to the top.
// Use this before tapping header elements (open-history-button /
// open-settings-button) that live at the very top of the tray ScrollView.
// Waits up to 15s for the tray — after a submission the tray unmounts
// briefly while the confirmation overlay is active.
async function scrollTrayToTop() {
  await waitFor(element(by.id("marble-tray-scroll-view")))
    .toBeVisible()
    .withTimeout(15000);
  await element(by.id("marble-tray-scroll-view")).scrollTo("top");
}

function createExpoDevClientLaunchUrl() {
  const searchParams = new URLSearchParams({
    // Detox reverses the Metro port before launching instrumentation, so the
    // initial Expo dev-client bootstrap is most reliable through loopback.
    url: DEFAULT_DEV_SERVER_URL,
  });

  return `${DEFAULT_DEV_CLIENT_SCHEME}://expo-development-client/?${searchParams.toString()}`;
}

/**
 * Launches the Expo dev-client build on Android and waits until the
 * React Native app is fully interactive.
 *
 * Why this works:
 * - device.launchApp() opens the APK shell (DevLauncherActivity)
 * - device.openURL() sends a native Android Intent with the Metro URL
 * - expo-dev-client handles the Intent BEFORE the JS bridge exists
 *   → bypasses the server-picker UI entirely
 * - We then wait for the first testID to confirm JS is running
 */
async function launchExpoDevClient() {
  const devClientUrl = createExpoDevClientLaunchUrl();
  console.log("[e2e] launchExpoDevClient started.", {
    devServerUrl: DEFAULT_ANDROID_DEV_SERVER_URL,
    appId: DEFAULT_ANDROID_APP_ID,
    devClientUrl,
  });

  await waitForMetroServer();
  await waitForBackendServer();
  console.log("[e2e] Metro and backend servers are reachable.");

  // Belt-and-suspenders: ensure ADB port reversal alongside detox.config reversePorts
  try {
    execFileSync("adb", ["reverse", `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`], {
      stdio: "pipe",
    });
    execFileSync(
      "adb",
      ["reverse", `tcp:${BACKEND_PORT}`, `tcp:${BACKEND_PORT}`],
      { stdio: "pipe" },
    );
  } catch {
    console.warn(
      "[e2e] adb reverse failed; continuing with Detox reversePorts.",
    );
  }

  // 1. Cold-start using Detox's built-in URL override so the initial
  // instrumented launch goes directly through the Expo dev-client intent.
  await device.launchApp({ newInstance: true, url: devClientUrl });
  console.log("[e2e] device.launchApp resolved.");
  await device.disableSynchronization();
  await waitForConnectedEmulator();
  console.log("[e2e] waitForConnectedEmulator resolved.");

  const existingReadyTestId = await maybeWaitForBootstrappedApp(5000);
  if (existingReadyTestId) {
    console.log("[e2e] Expo runtime already ready.", { existingReadyTestId });
    await device.enableSynchronization();
    return;
  }

  // 2. If the initial launch still did not surface the RN runtime, retry the
  // same dev-client URL through ADB as a fallback.
  console.log("[e2e] Retrying Expo dev-client URL via ADB fallback.");
  await openDevClientUrlWithRetries(devClientUrl);

  // 3. Wait for JS runtime to be ready (bundle load + React mount).
  const readyTestId = await waitForBootstrappedApp(120000);
  console.log("[e2e] Expo runtime became observable to Detox.", {
    readyTestId,
  });

  // 4. Re-enable Detox synchronization before test interactions begin.
  await device.enableSynchronization();
}

async function advanceToJoinCode() {
  // Fast-exit: already on the join-code screen.
  if (await isVisible("join-code-input", 2000)) {
    return;
  }

  // Wait for the onboarding scroll view — JS bundle may still be hydrating.
  await waitFor(element(by.id("onboarding-scroll-view")))
    .toBeVisible()
    .withTimeout(20000);

  // Scroll to top so Skip is never clipped below the safe-area.
  await element(by.id("onboarding-scroll-view")).scrollTo("top");

  // Try Skip first (slides 0–N-1). On the last slide Skip is hidden, so fall
  // back to Next. Both buttons call handleCompleteIntro() which navigates to
  // the join-code screen when no session exists.
  try {
    await waitFor(element(by.id("skip-onboarding-button")))
      .toBeVisible()
      .withTimeout(4000);
    await element(by.id("skip-onboarding-button")).tap();
  } catch {
    await waitFor(element(by.id("next-onboarding-button")))
      .toBeVisible()
      .withTimeout(4000);
    await element(by.id("next-onboarding-button")).tap();
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

async function maybeWaitForBootstrappedApp(timeout = 5000) {
  try {
    return await waitForBootstrappedApp(timeout);
  } catch {
    return null;
  }
}

async function openDevClientUrlWithRetries(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const emulatorSerial = await waitForConnectedEmulator();

      await sleep(750);
      execFileSync(
        "adb",
        ["-s", emulatorSerial, "shell", buildAdbBootstrapCommand(url)],
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

function buildAdbBootstrapCommand(url) {
  return buildAdbIntentCommand(url, false);
}

function buildAdbIntentCommand(url, includeAppId) {
  const command = [
    "am start -W -a android.intent.action.VIEW -d",
    quoteForAndroidShell(url),
  ];

  if (includeAppId) {
    command.push(DEFAULT_ANDROID_APP_ID);
  }

  return command.join(" ");
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

async function waitForMetroServer(timeout = 15000) {
  const statusUrl = `${DEFAULT_DEV_SERVER_URL}/status`;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(statusUrl, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore failures and retry.
    }

    await sleep(500);
  }

  throw new Error(
    `Metro dev server is not reachable at ${statusUrl}. Start it with \`pnpm e2e:android:metro\` from apps/mobile before running Detox.`,
  );
}

async function waitForBackendServer(timeout = 15000) {
  const healthUrl = `${DEFAULT_BACKEND_URL}/health`;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore failures and retry.
    }

    await sleep(500);
  }

  throw new Error(
    `Backend health endpoint is not reachable at ${healthUrl}. Start the backend and ensure it is healthy before running Detox.`,
  );
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loginAsAdmin() {
  const adminEmail = process.env.DETOX_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.DETOX_ADMIN_PASSWORD || "password1234";

  // Reset backend state and boot a clean app instance landing on onboarding.
  await resetBackendTestState();
  await launchExpoDevClient();

  // Skip the intro slides to reach the join code screen, then tap "Admin access".
  await advanceToJoinCode();
  await element(by.id("admin-entry-link")).tap();

  // Wait for the admin login screen to appear.
  await waitFor(element(by.id("admin-login-root")))
    .toBeVisible()
    .withTimeout(10000);

  // Fill in credentials and submit.
  await element(by.id("admin-email-input")).replaceText(adminEmail);
  await element(by.id("admin-password-input")).replaceText(adminPassword);
  await element(by.id("admin-login-submit-button")).tap();

  // Wait for the admin panel ScrollView to appear — this is at the very top
  // of the screen so the scroll position stays at zero after login.
  // The individual tests are responsible for scrolling to their own content.
  await waitFor(element(by.id("admin-panel-screen")))
    .toBeVisible()
    .withTimeout(45000);
}

module.exports = {
  advanceToJoinCode,
  buildAdbBootstrapCommand,
  completeAnonymousMemberJourney,
  createExpoDevClientLaunchUrl,
  isVisible,
  launchExpoDevClient,
  loginAsAdmin,
  maybeWaitForBootstrappedApp,
  openDevClientUrlWithRetries,
  resetBackendTestState,
  resetToOnboardingIfNeeded,
  scrollTrayToTop,
  scrollTrayUntilVisible,
  SEEDED_MANAGER_CODE,
  waitForBootstrappedApp,
};
