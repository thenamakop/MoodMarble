# Android E2E Testing Guide

This guide explains how to run the Detox end-to-end tests for the MoodMarble mobile app on Android.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop (for PostgreSQL and Redis)
- Android Studio with:
  - Android SDK
  - Android NDK 27.x
  - CMake 3.22.x
  - An Android emulator (default: `Pixel_8`)
- Environment variables:
  - `ANDROID_HOME` pointing to your Android SDK
  - Optionally `DETOX_AVD_NAME` to override the emulator name

## One-Time Setup

1. **Install dependencies:**

   ```bash
   cd apps/mobile
   pnpm install
   ```

2. **Create the emulator if it does not exist:**

   Open Android Studio → Virtual Device Manager and create a Pixel 8 API 36 emulator named `Pixel_8`, or run:

   ```bash
   avdmanager create avd -n Pixel_8 -k "system-images;android-36;google_apis;x86_64"
   ```

3. **Start the backend and infrastructure:**

   ```bash
   cd ../..
   docker compose up -d
   cd apps/backend
   pnpm db:migrate
   pnpm db:seed
   pnpm seed:admin
   pnpm seed:dashboard
   pnpm dev
   ```

4. **Start Metro:**

   In a second terminal:

   ```bash
   cd apps/mobile
   pnpm e2e:android:metro
   ```

## Running the Tests

### Quick preflight check

Verify everything is reachable before running the full suite:

```bash
cd apps/mobile
pnpm e2e:android:preflight
```

Expected output: all checks green (`Android E2E preflight passed`).

### Build the test APKs

```bash
cd apps/mobile
pnpm e2e:android:build
```

This runs `detox build -c android.emu.debug` and produces:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`

### Run all tests

```bash
cd apps/mobile
pnpm e2e:android:test
```

This runs the preflight, then Detox with `--loglevel verbose`.

### Run a single test file

```bash
cd apps/mobile
npx detox test -c android.emu.debug --loglevel verbose e2e/manager-journey.e2e.cjs
```

### Run in headless mode

```bash
cd apps/mobile
pnpm e2e:android:test:headless
```

## Troubleshooting

### `TypeError: this._sendMonitoredAction is not a function`

If you see an error like:

```text
An error occurred while waiting for the app to become ready. Waiting for disconnection...
error: TypeError: this._sendMonitoredAction is not a function
    at Client.sendAction (node_modules/detox/src/client/Client.js:148:14)
    at Client.waitUntilReady (node_modules/detox/src/client/Client.js:205:18)
```

This is a Detox-internal runtime failure, not an assertion failure in your test code. It usually means Detox could not establish its instrumentation bridge with the app process during launch. Try the following in order:

1. **Ensure both Metro and backend are running.**
   The app must be able to load the JS bundle and reach `http://127.0.0.1:3000/health` (via ADB reverse).

2. **Run the preflight check.**
   ```bash
   pnpm e2e:android:preflight
   ```

3. **Clean the emulator state.**
   Stop the test, then run:
   ```bash
   adb shell am force-stop com.thenamak.MoodMarble
   adb uninstall com.thenamak.MoodMarble
   adb uninstall com.thenamak.MoodMarble.test
   adb shell pm clear com.thenamak.MoodMarble
   ```

4. **Cold-boot the emulator.**
   In Android Studio, open the AVD manager, click the down arrow on `Pixel_8`, and choose **Cold Boot Now**.

5. **Wipe data and restart the emulator.**
   If cold boot does not help, use **Wipe Data** on the virtual device.

6. **Check the Android logs.**
   In a separate terminal, run:
   ```bash
   adb logcat -s MoodMarble:* Detox:* AndroidRuntime:*
   ```
   Then rerun the test. Look for crashes, missing native modules, or dev-client connection errors.

7. **Rebuild everything.**
   Sometimes the debug APK and test APK fall out of sync:
   ```bash
   rm -rf android/app/build
   pnpm e2e:android:build
   ```

8. **Try a Detox version bump or downgrade.**
   The project currently uses Detox `^20.41.0`. Some combinations of Detox, React Native, and the Android emulator image have internal timing issues during `waitUntilReady`. If the above steps fail, try upgrading to the latest Detox 20.x patch:
   ```bash
   cd apps/mobile
   pnpm add -D detox@latest
   ```
   Then rebuild and rerun.

### App launches but tests cannot find elements

- Make sure the emulator screen is not locked.
- Disable system animations (`adb shell settings put global animator_duration_scale 0`) — the preflight already does this.
- Increase `withTimeout()` values in tests if the emulator is slow.

### Port reverse failures

If you see warnings about ADB reverse, manually forward the ports:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8097 tcp:8097
adb reverse tcp:3000 tcp:3000
```

`detox.config.cjs` already lists these in `reversePorts`, but running them manually can help when the emulator was restarted.
