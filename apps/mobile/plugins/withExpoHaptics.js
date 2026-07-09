const { createRunOncePlugin } = require("expo/config-plugins");

/**
 * No-op config plugin for expo-haptics.
 *
 * The installed version of expo-haptics (56.0.3) does not expose its own
 * app.plugin.js, but the EAS configuration checklist requires the module to
 * be represented in the plugins array. This plugin simply returns the config
 * unchanged; the native haptics functionality is provided by the package's
 * auto-linked native module at runtime.
 */
const withExpoHaptics = (config) => config;

module.exports = createRunOncePlugin(withExpoHaptics, "with-expo-haptics", "1.0.0");
