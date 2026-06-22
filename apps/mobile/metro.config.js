const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  ...new Set([...(config.watchFolders ?? []), workspaceRoot]),
];
config.resolver = {
  ...(config.resolver ?? {}),
  unstable_enableSymlinks: true,
};

module.exports = config;
