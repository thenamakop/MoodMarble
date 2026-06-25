const { execFileSync } = require("child_process");
const { readFileSync } = require("fs");
const path = require("path");
const { by, device, element, waitFor } = require("detox");
const jwt = require("jsonwebtoken");

const DEFAULT_MANAGER_JWT_SECRET = "local-dev-jwt-secret-change-me";
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

// Scrolls the marble tray all the way to the top using scrollTo("top"),
// then waits for testID to be visible. Use this before tapping header
// elements (open-history-button / open-settings-button) that live at the
// very top of the tray ScrollView.
async function scrollTrayToTop() {
  await waitFor(element(by.id("marble-tray-scroll-view")))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id("marble-tray-scroll-view")).scrollTo("top");
}

function createExpoDevClientLaunchUrl() {
  const searchParams = new URLSearchParams({
    // Detox reverses the Metro port before launching instrumentation, so the
    // initial Expo dev-client bootstrap is most reliable through loopback.
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
  // #region debug-point A:launch-start
  reportDebugEvent("A", "[DEBUG] launchExpoDevClient started.", {
    devServerUrl: DEFAULT_ANDROID_DEV_SERVER_URL,
    appId: DEFAULT_ANDROID_APP_ID,
    devClientUrl,
  });
  // #endregion

  await waitForMetroServer();
  await waitForBackendServer();
  reportDebugEvent(
    "A",
    "[DEBUG] Metro and backend servers are reachable before launching the dev client.",
    {
      metroStatusUrl: `${DEFAULT_DEV_SERVER_URL}/status`,
      backendHealthUrl: `${DEFAULT_BACKEND_URL}/health`,
    },
  );
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
    reportDebugEvent(
      "B",
      "[DEBUG] adb reverse failed during launchExpoDevClient; continuing with Detox reversePorts.",
      {
        metroPort: METRO_PORT,
        backendPort: BACKEND_PORT,
      },
    );
  }

  // 1. Cold-start using Detox's built-in URL override so the initial
  // instrumented launch goes directly through the Expo dev-client intent.
  await device.launchApp({ newInstance: true, url: devClientUrl });
  reportDebugEvent("A", "[DEBUG] device.launchApp resolved.", {
    newInstance: true,
    usedUrlOverride: true,
  });
  await device.disableSynchronization();
  reportDebugEvent("A", "[DEBUG] device.disableSynchronization resolved.", {});
  await waitForConnectedEmulator();
  reportDebugEvent("A", "[DEBUG] waitForConnectedEmulator resolved.", {});

  const existingReadyTestId = await maybeWaitForBootstrappedApp(5000);
  if (existingReadyTestId) {
    reportDebugEvent(
      "C",
      "[DEBUG] Existing Expo runtime was already ready after launchApp.",
      {
        readyTestId: existingReadyTestId,
      },
    );
    await device.enableSynchronization();
    return;
  }

  // 2. If the initial launch still did not surface the RN runtime, retry the
  // same dev-client URL through ADB as a fallback.
  // #region debug-point D:open-url
  reportDebugEvent(
    "D",
    "[DEBUG] Retrying Expo dev-client URL via ADB fallback.",
    {
      devClientUrl,
    },
  );
  // #endregion
  await openDevClientUrlWithRetries(devClientUrl);

  // 3. Wait for JS runtime to be ready (bundle load + React mount).
  const readyTestId = await waitForBootstrappedApp(120000);
  // #region debug-point C:ready-test-id
  reportDebugEvent("C", "[DEBUG] Expo runtime became observable to Detox.", {
    readyTestId,
  });
  // #endregion

  // 4. Re-enable Detox synchronization before test interactions begin.
  await device.enableSynchronization();
}

/**
 * Relaunches without reinstalling (fast path for test suite resets).
 * Only use this after the first launchExpoDevClient() in the same session.
 */
async function relaunchExpoDevClient() {
  await device.launchApp({ newInstance: false });
  reportDebugEvent("A", "[DEBUG] relaunch device.launchApp resolved.", {
    newInstance: false,
  });
  await device.disableSynchronization();
  reportDebugEvent(
    "A",
    "[DEBUG] relaunch device.disableSynchronization resolved.",
    {},
  );

  const existingReadyTestId = await maybeWaitForBootstrappedApp(3000);
  if (existingReadyTestId) {
    reportDebugEvent(
      "C",
      "[DEBUG] Existing Expo runtime was already ready after relaunch.",
      {
        readyTestId: existingReadyTestId,
      },
    );
    await device.enableSynchronization();
    return;
  }

  const readyTestId = await waitForBootstrappedApp(90000);
  reportDebugEvent(
    "C",
    "[DEBUG] Expo runtime became observable after relaunch.",
    {
      readyTestId,
    },
  );
  await device.enableSynchronization();
}

async function advanceToJoinCode() {
  // Fast-exit: already on the join-code screen.
  if (await isVisible("join-code-input", 2000)) {
    return;
  }

  // Wait for the onboarding scroll view — the JS bundle may still be
  // hydrating after a cold launch.
  await waitFor(element(by.id("onboarding-scroll-view")))
    .toBeVisible()
    .withTimeout(20000);

  // Scroll to absolute top so the Skip / Next button is never clipped.
  // This mirrors how the admin journey calls scrollTo("top") on its scroll
  // view before any button tap.
  await element(by.id("onboarding-scroll-view")).scrollTo("top");

  // Use a direct waitFor + tap — the same pattern the admin journey uses —
  // rather than isVisible() which treats a 75%-coverage miss as "not found".
  // Skip is visible on slides 0–1; the last slide shows Next instead.
  if (await isVisible("skip-onboarding-button", 3000)) {
    await waitFor(element(by.id("skip-onboarding-button")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("skip-onboarding-button")).tap();
  } else {
    await waitFor(element(by.id("next-onboarding-button")))
      .toBeVisible()
      .withTimeout(5000);
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

async function openUrlWithRetries(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await device.launchApp({ newInstance: false, url });
      return;
    } catch (error) {
      lastError = error;

      try {
        const emulatorSerial = await waitForConnectedEmulator();
        const command = buildAdbDeepLinkCommand(url);

        await sleep(750);
        execFileSync("adb", ["-s", emulatorSerial, "shell", command], {
          stdio: "pipe",
        });
        return;
      } catch (fallbackError) {
        lastError = fallbackError;
      }

      if (attempt === attempts) {
        throw lastError;
      }

      await sleep(1000);
    }
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

function buildAdbDeepLinkCommand(url) {
  return buildAdbIntentCommand(url, true);
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

function isAppRuntimeFocused(serial) {
  try {
    const output = execFileSync(
      "adb",
      ["-s", serial, "shell", "dumpsys", "window"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    return (
      output.includes(`${DEFAULT_ANDROID_APP_ID}/.MainActivity`) ||
      output.includes(
        `${DEFAULT_ANDROID_APP_ID}/${DEFAULT_ANDROID_APP_ID}.MainActivity`,
      )
    );
  } catch {
    return false;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function reportDebugEvent(hypothesisId, msg, data) {
  const envPath = path.join(process.cwd(), ".dbg", "e2e-manual-edit-audit.env");
  let debugUrl = "http://127.0.0.1:7777/event";
  let debugSessionId = "e2e-manual-edit-audit";
  try {
    const envFile = readFileSync(envPath, "utf8");
    debugUrl = envFile.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugUrl;
    debugSessionId =
      envFile.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || debugSessionId;
  } catch {}
  fetch(debugUrl, {
    method: "POST",
    body: JSON.stringify({
      sessionId: debugSessionId,
      runId: "pre-fix",
      hypothesisId,
      location: "apps/mobile/e2e/helpers.cjs",
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
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
  completeAnonymousMemberJourney,
  createAdminLaunchUrl,
  createExpoDevClientLaunchUrl,
  createManagerLaunchUrl,
  buildAdbDeepLinkCommand,
  buildAdbBootstrapCommand,
  isVisible,
  launchExpoDevClient,
  loginAsAdmin,
  maybeWaitForBootstrappedApp,
  isAppRuntimeFocused,
  openDevClientUrlWithRetries,
  openUrlWithRetries,
  relaunchExpoDevClient,
  resetBackendTestState,
  resetToOnboardingIfNeeded,
  scrollTrayToTop,
  scrollTrayUntilVisible,
  waitForBootstrappedApp,
};
