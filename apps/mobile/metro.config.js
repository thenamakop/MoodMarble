const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// watchFolders must include the monorepo root so Metro can resolve the shared
// packages/ directory (e.g. packages/shared). Only the minimal set of paths
// needed for module resolution are watched — everything else is blocked below.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), workspaceRoot])];

// ---------------------------------------------------------------------------
// blockList — dramatically reduces the number of files Metro watches.
//
// Metro's FallbackWatcher (used on Windows without Watchman) calls fs.watch()
// on every directory it encounters while recursively walking watchFolders.
// With workspaceRoot = C:\MoodMarble the default config causes Metro to watch
// ~200 000 files across node_modules, the backend, docs, scripts, and IDE
// directories — none of which affect the mobile bundle. This makes the initial
// scan take minutes and makes the Metro terminal unresponsive.
//
// Rules:
//  - node_modules at the workspace root: Metro resolves packages from them but
//    does NOT need to watch them for changes — package code never changes
//    during development. Blocking them cuts ~180 000 files.
//  - apps/backend: backend TypeScript source is irrelevant to the mobile bundle.
//  - Everything else at the repo root that isn't packages/ or apps/mobile.
//
// NOTE: posixPathMatchesPattern in Metro converts Windows backslashes to /
// before testing, so all patterns use forward slashes only.
// ---------------------------------------------------------------------------

const existingBlockList = config.resolver?.blockList;

const extraBlockPatterns = [
  // Root node_modules — Metro resolves from here but doesn't need to watch
  /\/node_modules\/.*/,

  // Backend app — no mobile relevance
  /\/apps\/backend\/.*/,

  // Repo-level directories with no mobile relevance
  /\/\.git\/.*/,
  /\/\.github\/.*/,
  /\/\.husky\/.*/,
  /\/\.idea\/.*/,
  /\/\.devin\/.*/,
  /\/\.expo\/.*/,
  /\/docs\/.*/,
  /\/scripts\/.*/,

  // Android Gradle build output inside autolinking (crashes FallbackWatcher
  // because directories appear/disappear mid-build)
  /\/node_modules\/expo-modules-autolinking\/android\//,

  // Android build output inside the mobile project itself
  /\/apps\/mobile\/android\/build\/.*/,
  /\/apps\/mobile\/android\/.gradle\/.*/,
];

function mergeBlockList(existing, additions) {
  if (Array.isArray(existing)) {
    return [...existing, ...additions];
  }

  if (existing) {
    return [existing, ...additions];
  }

  return additions;
}

config.resolver = {
  ...(config.resolver ?? {}),
  unstable_enableSymlinks: true,
  blockList: mergeBlockList(existingBlockList, extraBlockPatterns),
};

module.exports = config;
