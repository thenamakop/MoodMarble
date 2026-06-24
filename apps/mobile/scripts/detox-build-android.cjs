const { existsSync, writeFileSync } = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const defaultSdkRoot =
  process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || "D:\\Android";
const ndkVersion = process.env.ANDROID_NDK_VERSION || "27.1.12297006";
const cmakeVersion = process.env.ANDROID_CMAKE_VERSION || "3.22.1";
const gradleCommand =
  process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const shortPaths = resolveShortPaths();

try {
  // #region debug-point C:build-entry
  (() => {
    const envPath = path.join(repoRoot, ".dbg", "e2e-manual-edit-audit.env");
    let debugUrl = "http://127.0.0.1:7777/event";
    let debugSessionId = "e2e-manual-edit-audit";
    try {
      const envFile = require("fs").readFileSync(envPath, "utf8");
      debugUrl = envFile.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugUrl;
      debugSessionId =
        envFile.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || debugSessionId;
    } catch {}
    fetch(debugUrl, {
      method: "POST",
      body: JSON.stringify({
        sessionId: debugSessionId,
        runId: "pre-fix",
        hypothesisId: "C",
        location: "apps/mobile/scripts/detox-build-android.cjs:14",
        msg: "[DEBUG] Android Detox build script started.",
        data: {
          defaultSdkRoot,
          ndkVersion,
          cmakeVersion,
          nodeEnv: process.env.NODE_ENV ?? "production",
        },
        ts: Date.now(),
      }),
    }).catch(() => {});
  })();
  // #endregion
  ensureAndroidSdkLayout();
  run(
    "pnpm",
    ["exec", "expo", "prebuild", "--platform", "android", "--no-install"],
    shortPaths.appRoot,
    {
      ANDROID_HOME: defaultSdkRoot,
      ANDROID_SDK_ROOT: defaultSdkRoot,
      CI: "1",
      NODE_ENV: process.env.NODE_ENV ?? "production",
    },
  );

  if (!existsSync(path.join(shortPaths.appRoot, "android"))) {
    throw new Error(
      "Expo prebuild did not create the Android project required for Detox.",
    );
  }

  writeAndroidLocalProperties(shortPaths.appRoot);
  run(
    gradleCommand,
    ["assembleDebug", "assembleAndroidTest", "-DtestBuildType=debug"],
    path.join(shortPaths.appRoot, "android"),
    {
      ANDROID_HOME: defaultSdkRoot,
      ANDROID_SDK_ROOT: defaultSdkRoot,
      NODE_ENV: process.env.NODE_ENV ?? "production",
    },
  );
} finally {
  shortPaths.cleanup();
}

function run(command, args, cwd, env = {}) {
  // #region debug-point C:run-command
  (() => {
    const envPath = path.join(repoRoot, ".dbg", "e2e-manual-edit-audit.env");
    let debugUrl = "http://127.0.0.1:7777/event";
    let debugSessionId = "e2e-manual-edit-audit";
    try {
      const envFile = require("fs").readFileSync(envPath, "utf8");
      debugUrl = envFile.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugUrl;
      debugSessionId =
        envFile.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || debugSessionId;
    } catch {}
    fetch(debugUrl, {
      method: "POST",
      body: JSON.stringify({
        sessionId: debugSessionId,
        runId: "pre-fix",
        hypothesisId: "C",
        location: "apps/mobile/scripts/detox-build-android.cjs:54",
        msg: "[DEBUG] Android Detox build script is running a child command.",
        data: {
          command,
          args,
          cwd,
          envOverrides: env,
          shell: false,
        },
        ts: Date.now(),
      }),
    }).catch(() => {});
  })();
  // #endregion
  const result =
    process.platform === "win32"
      ? spawnSync(
          process.env.ComSpec || "cmd.exe",
          ["/d", "/s", "/c", toWindowsCommand(command, args)],
          {
            cwd,
            env: {
              ...process.env,
              ...env,
            },
            stdio: "inherit",
            shell: false,
          },
        )
      : spawnSync(command, args, {
          cwd,
          env: {
            ...process.env,
            ...env,
          },
          stdio: "inherit",
          shell: false,
        });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(" ")} (exit ${result.status ?? "unknown"})`,
    );
  }
}

function toWindowsCommand(command, args) {
  return [command, ...args].map(quoteForWindowsCmd).join(" ");
}

function quoteForWindowsCmd(value) {
  if (!/[ \t"]/u.test(value)) {
    return value;
  }

  const escaped = value
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\+)$/g, "$1$1");
  return `"${escaped}"`;
}

function ensureAndroidSdkLayout() {
  if (!existsSync(defaultSdkRoot)) {
    throw new Error(
      `Android SDK root was not found at ${defaultSdkRoot}. Set ANDROID_SDK_ROOT or ANDROID_HOME to D:\\Android.`,
    );
  }

  const requiredPaths = [
    {
      label: "Android platform-tools",
      path: path.join(
        defaultSdkRoot,
        "platform-tools",
        process.platform === "win32" ? "adb.exe" : "adb",
      ),
    },
    {
      label: `Android NDK ${ndkVersion}`,
      path: path.join(defaultSdkRoot, "ndk", ndkVersion),
    },
    {
      label: `Android CMake ${cmakeVersion}`,
      path: path.join(defaultSdkRoot, "cmake", cmakeVersion),
    },
  ];

  const missingPaths = requiredPaths.filter((entry) => !existsSync(entry.path));

  if (missingPaths.length > 0) {
    const formattedMissingPaths = missingPaths
      .map((entry) => `- ${entry.label}: ${entry.path}`)
      .join("\n");
    throw new Error(
      `Android SDK components are missing under ${defaultSdkRoot}.\n${formattedMissingPaths}\nInstall the missing SDK components in Android Studio before running Detox Android builds.`,
    );
  }
}

function writeAndroidLocalProperties(currentAppRoot) {
  const properties = [`sdk.dir=${escapeGradlePath(defaultSdkRoot)}`];

  writeFileSync(
    path.join(currentAppRoot, "android", "local.properties"),
    `${properties.join("\n")}\n`,
  );
}

function escapeGradlePath(filePath) {
  return filePath.replace(/\\/g, "\\\\");
}

function resolveShortPaths() {
  return {
    appRoot,
    cleanup() {},
  };
}
