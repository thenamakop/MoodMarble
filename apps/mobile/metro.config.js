const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  ...new Set([...(config.watchFolders ?? []), workspaceRoot]),
];

// Metro's FallbackWatcher (used on Windows when Watchman is absent) calls
// fs.watch() on every directory it finds while recursively walking watchFolders.
// expo-modules-autolinking ships a compiled Gradle plugin whose build output
// directories (build/classes/kotlin/main/expo …) can appear and disappear
// during an Android build, causing fs.watch() to throw ENOENT and crash Metro.
// Adding this directory to blockList causes FallbackWatcher's filterDir() to
// skip the entire android/ subtree before any fs.watch() calls are made.
// posixPathMatchesPattern converts Windows backslashes to / before testing, so
// the pattern only needs forward slashes.
const existingBlockList = config.resolver?.blockList;
const androidGradlePattern =
  /\/node_modules\/expo-modules-autolinking\/android\//;

config.resolver = {
  ...(config.resolver ?? {}),
  unstable_enableSymlinks: true,
  blockList: Array.isArray(existingBlockList)
    ? [...existingBlockList, androidGradlePattern]
    : existingBlockList
      ? [existingBlockList, androidGradlePattern]
      : [androidGradlePattern],
};

module.exports = config;
