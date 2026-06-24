# Manager Dashboard Android Error Report

Date: 2026-06-23
Project: `C:\MoodMarble`
Status: Open

## Summary

The manager dashboard can be opened in the web browser, but opening the manager route on the Android emulator fails in the development build.

The failure is not caused by backend unavailability or missing ADB port reversal. The emulator reaches the app process, but the Android dev build fails while resolving the Metro bundle for the manager route.

## Observed Behavior

- Web:
  - Manager dashboard opens.
  - Graphs render.
  - Team switching is only enabled when multiple manager teams are present in the route params.
  - The manager dashboard export control is intentionally disabled and shows `Coming soon`.
- Android emulator:
  - `MainActivity` launches successfully.
  - Backend health check succeeds.
  - Metro responds on `127.0.0.1:8081`.
  - A manager deep link is delivered to the app.
  - The app does not reach the dashboard view.
  - The app displays a development-build error screen.

## Error Seen On Emulator

The emulator displayed:

- `There was a problem loading the project.`
- `This development build encountered the following error.`
- `com.facebook.react.common.DebugServerException`
- URL includes:
  - `http://127.0.0.1:8081/--/manager.bundle?...`
- Body includes:
  - `UnableToResolveError`

## Reproduction Steps

1. Start backend:

```bash
cd C:\MoodMarble
pnpm --filter backend dev
```

2. Start Metro for the development build:

```bash
cd C:\MoodMarble\apps\mobile
pnpm e2e:android:metro
```

3. Ensure emulator is connected:

```bash
adb devices
```

4. Reverse ports:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

5. Launch the dev client with a direct manager route through Metro:

```powershell
$managerRuntimeUrl = node -e "const jwt=require('jsonwebtoken'); const token=jwt.sign({workspace_id:'ws_localdemo',team_id:'tm_product',role:'manager'}, process.env.JWT_SECRET || 'local-dev-jwt-secret-change-me', {expiresIn:'30d'}); const p=new URLSearchParams({date:'2026-06-22', manager_jwt: token, manager_teams:'tm_product:Product|tm_design:Design', start_date:'2026-06-16', team_id:'tm_product', team_name:'Product'}); process.stdout.write('http://127.0.0.1:8081/--/manager?'+p.toString());"
$encoded = [System.Uri]::EscapeDataString($managerRuntimeUrl)
$devClientUrl = "exp+moodmarble://expo-development-client/?url=$encoded&disableOnboarding=1"
adb shell am force-stop com.thenamak.MoodMarble
adb shell am start -W -a android.intent.action.VIEW -d $devClientUrl
```

6. Observe emulator result:
  - Development build error screen instead of manager dashboard.

## Evidence Collected

- Emulator connectivity:
  - `adb devices` shows `emulator-5554 device`
- Backend:
  - `http://127.0.0.1:3000/health` returned `200`
- Metro:
  - `http://127.0.0.1:8081` returned `200`
- App process:
  - `dumpsys activity top` confirms `com.thenamak.MoodMarble/.MainActivity`
- Screenshot captured:
  - `apps/mobile/manager-emulator.png`

## Android Wiring Verification

Android Detox/native wiring was checked and rebuilt successfully:

- `apps/mobile/android/app/build.gradle`
  - contains `testInstrumentationRunner "com.wix.detox.DetoxJUnitRunner"`
- `apps/mobile/android/build.gradle`
  - contains local Detox Maven repo
- `apps/mobile/android/app/src/androidTest/java/com/thenamak/MoodMarble/DetoxTest.java`
  - exists
- Rebuild:

```bash
cd C:\MoodMarble\apps\mobile
pnpm e2e:android:build
```

- Result:
  - `BUILD SUCCESSFUL`
- Fresh artifacts exist:
  - `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
  - `apps/mobile/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`

## Scope Clarification

Two behaviors observed on the web dashboard are currently expected by code and tracker scope:

- Team switching:
  - enabled only when `manager_teams.length > 1`
- Export button:
  - intentionally disabled on the manager dashboard
  - export belongs to the Week 7 admin flow, not the manager dashboard flow

This means the primary defect in this report is the Android manager-route loading failure, not the web dashboard export placeholder.

## Suspected Root Cause

Most likely cause:

- Metro or Expo Router cannot resolve the Android development bundle entry for the manager route when launched as `/--/manager`.

Possible contributing factors:

- route-specific native entry handling in Expo Router
- mismatch between native deep-link normalization and route bundling
- dev-client route launch format differs from working browser route format

## Relevant Files

- `apps/mobile/src/app/manager.tsx`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/+native-intent.tsx`
- `apps/mobile/e2e/helpers.cjs`
- `apps/mobile/e2e/manager-journey.e2e.cjs`
- `apps/mobile/manager-emulator.png`
- `debug-manager-dashboard-interactions.md`

## Recommended Next Actions

1. Capture the exact Metro `UnableToResolveError` text from the packager output for `/--/manager.bundle`.
2. Verify whether Expo Router expects `/manager` to be bundled through the current `src/app` layout on Android dev builds.
3. Compare a working root route launch versus failing `/--/manager` bundle resolution.
4. If needed, adjust native route entry handling so Android opens the app shell first and navigates to `/manager` after runtime bootstrap.
