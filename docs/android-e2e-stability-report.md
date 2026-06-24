# Android E2E Stability Report

## Executive Summary

The basic Android E2E suite has been implemented using Detox. It proves that the core React Native Expo codebase can successfully run the three critical access journeys natively on an Android API 34 x86_64 emulator.

## What Passed

The E2E test runs successfully verified the following functionality without relying on manual steps:
- **Emulator Launch & Device Detection**: Detox successfully spins up the `Pixel_8` headless emulator, hooks into ADB, installs the native test APKs, and launches the app runtime.
- **Backend Test Seeding Integration**: The mobile tests successfully orchestrate `__test/reset` calls to truncate the database and re-hydrate `ws_localdemo`, its associated teams, and test admin credentials automatically.
- **Employee Access Path**: The standard onboarding flow successfully completes anonymous login, team selection, and stores the `device_jwt` locally.
- **Manager & Admin Deep Links**: Bypassing UI taps for login screens via the `exp+moodmarble://` deep link pattern correctly initializes hydrated auth sessions for `manager_jwt` and `admin_jwt`.
- **Mood Submission**: A standard mood submission correctly interacts with the backend over `10.0.2.2:3000` from the Android environment.
- **Screen Navigation**: Accessing history, settings, and the admin panel screens renders the expected React Navigation boundaries.

## What Failed

There are no strict test failures on the verified journeys, however:
- **Detox & Layout Subtree Overlaps**: Interacting with UI elements at the bottom of the screen (e.g. the original `admin-entry-link`) consistently times out in Detox. This is due to NativeTabs intercepting taps. Deep-linking correctly bypasses this regression, but it means testing UI layout overlaps remains brittle.
- **Concurrent Test Runs**: Attempting to run the test suites concurrently without sequential seeding causes database collisions. Tests must run serially.

## What Remains Flaky or Manual

- **Emulator Cold Boot Limits**: If a test run is aborted mid-execution, the ADB hook and emulator instance occasionally leave zombie processes running in the background, requiring a manual `adb kill-server` and/or `taskkill /F /IM qemu-system-x86_64-headless.exe`.
- **Android Studio Dependencies**: The SDK and Emulator paths rely on fixed environment variables (`D:\Android`). Developers with non-standard setups must export `ANDROID_SDK_ROOT` and `ANDROID_HOME` correctly for `detox` to function.

## Roadmap to Considered Stable

To consider the Android testing path 100% stable for CI/CD integration, the following infrastructure improvements should be handled:
1. **CI Containerization**: The Detox flow should be tested in an ephemeral CI runner (like GitHub Actions) with hardware acceleration enabled for nested virtualization.
2. **Database Isolation**: The test runner should spin up an isolated postgres/redis instance (or dynamically prefixed DB instances) per worker to allow parallel suite execution.
3. **Automated Emulator Teardown**: Post-run scripts should enforce ADB cleanup.
