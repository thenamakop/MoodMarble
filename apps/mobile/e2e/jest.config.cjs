module.exports = {
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/**/*.e2e.cjs"],
  testTimeout: 180000,
  maxWorkers: 1,
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  reporters: ["detox/runners/jest/reporter"],
  testEnvironment: "detox/runners/jest/testEnvironment",
  setupFilesAfterEnv: ["<rootDir>/e2e/setup.cjs"],
};
