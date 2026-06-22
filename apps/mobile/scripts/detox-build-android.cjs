const { existsSync } = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const gradleCommand =
  process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const shortPaths = resolveShortPaths();

try {
  run(
    "pnpm",
    [
      "exec",
      "expo",
      "prebuild",
      "--platform",
      "android",
      "--non-interactive",
      "--no-install",
    ],
    shortPaths.appRoot,
  );

  if (!existsSync(path.join(shortPaths.appRoot, "android"))) {
    throw new Error(
      "Expo prebuild did not create the Android project required for Detox.",
    );
  }

  run(
    gradleCommand,
    ["assembleDebug", "assembleAndroidTest", "-DtestBuildType=debug"],
    path.join(shortPaths.appRoot, "android"),
  );
} finally {
  shortPaths.cleanup();
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(" ")} (exit ${result.status ?? "unknown"})`,
    );
  }
}

function resolveShortPaths() {
  if (process.platform !== "win32") {
    return {
      appRoot,
      cleanup() {},
    };
  }

  const drive = (process.env.DETOX_SUBST_DRIVE || "M:").toUpperCase();

  run("subst", [drive, repoRoot], appRoot);

  return {
    appRoot: path.win32.join(`${drive}\\`, "apps", "mobile"),
    cleanup() {
      run("subst", [drive, "/D"], appRoot);
    },
  };
}
