const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULT_SDK_ROOT = "D:\\Android";
const DEFAULT_AVD_NAME = "Pixel_8";
const DEFAULT_NDK_VERSION = "27.1.12297006";
const DEFAULT_CMAKE_VERSION = "3.22.1";

const resolvedSdkRoot =
  process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || DEFAULT_SDK_ROOT;
const emulatorExecutable = path.join(
  resolvedSdkRoot,
  "emulator",
  process.platform === "win32" ? "emulator.exe" : "emulator",
);

let hasFailure = false;

printSection("Android SDK");
printKeyValue("ANDROID_SDK_ROOT", process.env.ANDROID_SDK_ROOT || "(not set)");
printKeyValue("ANDROID_HOME", process.env.ANDROID_HOME || "(not set)");
printKeyValue("Resolved SDK root", resolvedSdkRoot);
printKeyValue("Expected SDK root", DEFAULT_SDK_ROOT);

if (!fs.existsSync(resolvedSdkRoot)) {
  fail(`Android SDK root was not found at ${resolvedSdkRoot}.`);
} else if (resolvedSdkRoot !== DEFAULT_SDK_ROOT) {
  warn(
    `Resolved SDK root is ${resolvedSdkRoot}. This repo is documented against ${DEFAULT_SDK_ROOT}.`,
  );
}

if (!fs.existsSync(emulatorExecutable)) {
  fail(`Android emulator executable was not found at ${emulatorExecutable}.`);
}

printSection("ADB");
const adbVersionResult = runCommand("adb", ["version"]);
if (adbVersionResult.status !== 0) {
  fail(
    "`adb` is not available on PATH. Ensure D:\\Android\\platform-tools is on PATH.",
  );
} else {
  ok("`adb` is available on PATH.");
}

printSection("Available AVDs");
const avdResult = runCommand(emulatorExecutable, ["-list-avds"]);
const avdNames = parseNonEmptyLines(avdResult.stdout);

if (avdResult.status !== 0) {
  fail("Unable to list Android virtual devices from the SDK emulator tools.");
} else if (!avdNames.includes(DEFAULT_AVD_NAME)) {
  fail(
    `Expected the ${DEFAULT_AVD_NAME} AVD, but found: ${avdNames.length > 0 ? avdNames.join(", ") : "(none)"}.`,
  );
} else {
  ok(`Found the ${DEFAULT_AVD_NAME} AVD.`);
}

printSection("Build Components");
const ndkPath = path.join(resolvedSdkRoot, "ndk", DEFAULT_NDK_VERSION);
const cmakePath = path.join(resolvedSdkRoot, "cmake", DEFAULT_CMAKE_VERSION);
const availableNdkVersions = fs.existsSync(path.join(resolvedSdkRoot, "ndk"))
  ? fs.readdirSync(path.join(resolvedSdkRoot, "ndk"))
  : [];
const availableCmakeVersions = fs.existsSync(
  path.join(resolvedSdkRoot, "cmake"),
)
  ? fs.readdirSync(path.join(resolvedSdkRoot, "cmake"))
  : [];

if (!fs.existsSync(ndkPath)) {
  fail(
    `Required Android NDK ${DEFAULT_NDK_VERSION} was not found at ${ndkPath}. Install it in Android Studio SDK Manager.`,
  );
} else {
  ok(`Found Android NDK ${DEFAULT_NDK_VERSION}.`);
}

if (!fs.existsSync(cmakePath)) {
  fail(
    `Required Android CMake ${DEFAULT_CMAKE_VERSION} was not found at ${cmakePath}. Install it in Android Studio SDK Manager.`,
  );
} else {
  ok(`Found Android CMake ${DEFAULT_CMAKE_VERSION}.`);
}

printSection("Connected Devices");
const devicesResult = runCommand("adb", ["devices"]);
const connectedDevices = parseAdbDevices(devicesResult.stdout);
const connectedEmulators = connectedDevices.filter((device) =>
  device.serial.startsWith("emulator-"),
);
const matchingEmulators = connectedEmulators.filter(
  (device) => getEmulatorAvdName(device.serial) === DEFAULT_AVD_NAME,
);

if (devicesResult.status !== 0) {
  fail("Unable to query connected Android devices with `adb devices`.");
} else if (connectedEmulators.some((d) => d.state === "offline")) {
  fail(
    "One or more Android emulators are in an 'offline' state. This means the emulator has crashed or ADB has hung. Run `adb kill-server` and `adb start-server`, or cold boot the emulator with `-wipe-data`.",
  );
} else if (matchingEmulators.length === 0) {
  fail(
    `No running Android emulator for ${DEFAULT_AVD_NAME} is connected. Start ${DEFAULT_AVD_NAME} in Android Studio or run: & '${DEFAULT_SDK_ROOT}\\emulator\\emulator.exe' -avd ${DEFAULT_AVD_NAME}`,
  );
} else {
  for (const emulator of matchingEmulators) {
    ok(
      `ADB sees ${emulator.serial} (${emulator.state}) for ${DEFAULT_AVD_NAME}.`,
    );
  }
}

if (matchingEmulators.length > 0) {
  printSection("Boot State");

  for (const emulator of matchingEmulators) {
    const bootState = runCommand("adb", [
      "-s",
      emulator.serial,
      "shell",
      "getprop",
      "sys.boot_completed",
    ]);
    const bootValue = bootState.stdout.trim();

    if (bootState.status !== 0 || bootValue !== "1") {
      fail(
        `${emulator.serial} is connected but not fully booted yet. Wait until Android finishes starting and run the preflight again.`,
      );
    } else {
      ok(`${emulator.serial} has completed boot for ${DEFAULT_AVD_NAME}.`);
    }
  }
}

checkUrl("Metro dev server", "http://127.0.0.1:8081/status");
checkUrl("Backend health endpoint", "http://127.0.0.1:3000/health");

if (hasFailure) {
  process.exit(1);
}

ok("Android E2E preflight passed.");

function runCommand(command, args, timeoutMs = 15000) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    timeout: timeoutMs,
  });
}

function parseNonEmptyLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseAdbDevices(output) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    })
    .filter((device) => device.serial && device.state);
}

function getEmulatorAvdName(serial) {
  const result = runCommand("adb", ["-s", serial, "emu", "avd", "name"], 5000);

  if (result.status !== 0) {
    return null;
  }

  return parseAdbAvdName(result.stdout);
}

function parseAdbAvdName(output) {
  return (
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && line !== "OK") ?? null
  );
}

function printSection(title) {
  console.log(`\n[${title}]`);
}

function printKeyValue(label, value) {
  console.log(`${label}: ${value}`);
}

function ok(message) {
  console.log(`[ok] ${message}`);
}

function warn(message) {
  console.warn(`[warn] ${message}`);
}

function fail(message) {
  hasFailure = true;
  console.error(`[fail] ${message}`);
}

function checkUrl(name, url) {
  const result = runCommand("curl", ["-I", "--max-time", "3", url]);

  if (result.status !== 0 || !/HTTP\/[0-9.]+ 2[0-9][0-9]/.test(result.stdout)) {
    fail(
      `${name} is not reachable at ${url}. Start the Metro server and backend before running Detox.`,
    );
  } else {
    ok(`${name} is reachable at ${url}.`);
  }
}
