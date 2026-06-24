# Debug Session: detox-ready-timeout

Status: [OPEN]

## Symptom

- Detox launches `android.emu.debug` on `emulator-5554`, then times out waiting for the app to become ready.
- Failure happens at `device.launchApp()` in both `member-journey.e2e.cjs` and `manager-journey.e2e.cjs`.
- User reports Metro was also tried in both development-client and Expo Go style flows, including pressing `a`, with the same readiness failure.

## Current Baseline

- `@expo/ui` has been removed from `apps/mobile/package.json`.
- `pnpm install` completed successfully and removed `@expo/ui` from `pnpm-lock.yaml`.
- `pnpm e2e:android:build` completed successfully and produced fresh APKs.
- Target mobile Jest regression suites passed `4/4` and `36/36`.

## Initial Hypotheses

1. The debug APK still crashes before the Detox websocket handshake due to a different native startup exception unrelated to `@expo/ui`.
2. Detox is launching a debug/dev-client build that now starts successfully, but it cannot reach Metro or the backend because the runtime host/ADB reverse state is wrong at launch time.
3. The app starts and stays alive, but Detox instrumentation is not attaching correctly because the Android test APK, runner, or dev-client readiness path is mismatched.
4. The app launches into an unexpected shell or mode because Metro was started with the wrong launcher flow (`Expo Go` / `press a`) rather than the expected dev-client handshake path.
5. Existing local worktree drift in Android/Detox-related files causes the rebuilt APKs to differ from the assumed configuration.

## Evidence To Collect

- `adb logcat` around app launch and crash/timeout time
- installed package / activity launch behavior on emulator
- Android test runner and APK metadata presence
- Detox / Metro configuration evidence from current repo files

## Current Investigation Thread

- Reproducing with the user's note that Metro was tried in both development-build and Expo Go style flows, including pressing `a` to open on Android.
- Verifying whether the generated Android project now contains a complete Detox native harness or still falls back to `android.test.InstrumentationTestRunner`.
- Verifying whether Gradle resolves `com.wix:detox` from the bundled local Maven repository under `node_modules/detox/Detox-android` or incorrectly falls through to JitPack.
- Treating Metro launch mode as a secondary factor until native runner and test APK wiring are proven correct.

## Evidence Collected

- Generated Android app config now includes `testInstrumentationRunner "com.wix.detox.DetoxJUnitRunner"`, `missingDimensionStrategy "detox", "full"`, `testBuildType`, and `androidTestImplementation("com.wix:detox:20.51.4")`.
- Generated root Android Gradle config now includes a local Maven repository pointing to `C:/MoodMarble/node_modules/detox/Detox-android`.
- `pnpm e2e:android:build` succeeds after adding the local Detox Maven repository to the Expo config plugin.
- Before reinstalling the APKs, `adb shell pm list instrumentation` reported `com.thenamak.MoodMarble.test/android.test.InstrumentationTestRunner`.
- After reinstalling the freshly built APKs, `adb shell pm list instrumentation` reported `com.thenamak.MoodMarble.test/com.wix.detox.DetoxJUnitRunner`.
- This confirms the original native Detox root cause was an incomplete generated Android test harness plus wrong Gradle repository resolution, not Metro mode.
- With the fresh harness installed, the failure signature changed: Detox no longer died at the original instrumentation boundary and instead failed during Expo dev-client bootstrap.
- Metro advertises `exp+moodmarble://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`, while the E2E helper had been cold-launching `moodmarble://expo-development-client/?url=...` without `disableOnboarding=1`.
- Expo documentation indicates cold-launching a development build for automation may require the generated dev-client scheme and `disableOnboarding=1` to skip first-launch onboarding.
- A follow-up helper patch has been applied to use `exp+moodmarble://expo-development-client/?url=...&disableOnboarding=1`.
- Latest rerun is blocked by a separate emulator transport failure: `adb shell settings put global animator_duration_scale 0` now returns `cmd: Can't find service: settings`.

## Constraints

- No product behavior, screen, navigation, or API changes.
- First code change to existing codebase, if needed, must be instrumentation only.
- No cleanup until user confirms the issue is fixed or aborts debugging.
