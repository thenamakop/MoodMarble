module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.cjs",
    },
    jest: {
      setupTimeout: 180000,
    },
  },
  apps: {
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      testBinaryPath:
        "android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk",
      build: "node ./scripts/detox-build-android.cjs",
    },
  },
  devices: {
    emulator: {
      type: "android.emulator",
      device: {
        avdName: process.env.DETOX_AVD_NAME ?? "Pixel_6_API_35",
      },
    },
  },
  configurations: {
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug",
    },
  },
};
