# Debug Session: manager-dashboard-interactions

Status: [OPEN]

## Symptom
- Web manager dashboard opens and renders graphs.
- Team selection cannot be changed.
- Export button cannot be used.
- Android APK wiring needs verification and rebuild if stale.

## Scope
- Verify behavior against the current implementation and Week 7 expectations.
- Verify Android manager-route/APK wiring.
- Do not change business logic before runtime/code-path evidence is collected.

## Initial Hypotheses
1. The manager screen is receiving a non-interactive state for team switching because only one team is parsed or passed through route params.
2. The export control is intentionally non-functional in the current implementation and labeled as a placeholder.
3. Android APK wiring is stale and does not include the latest route/native-intent fixes present in the JS source.
4. Native deep-link routing to `/manager` is still inconsistent with web routing, causing platform-specific behavior drift.
5. A recent patch changed shell routing or manager entry flow and introduced a regression for Android while leaving web usable.

## Evidence To Collect
- Manager dashboard screen props and control wiring.
- Manager route params, parsed teams, and enabled/disabled logic.
- Current APK/test APK build artifacts and Android wiring.
- Relevant tests and spec/week-plan references already encoded in repo tests/docs.

## Evidence Collected
- `apps/mobile/src/features/dashboard/manager-dashboard-screen.tsx`
  - Team selector is disabled when `canChangeTeam` is false.
  - Export control is hard-disabled and shows `Coming soon`.
- `apps/mobile/src/app/manager.tsx`
  - Team switching is enabled only when `managerTeams.length > 1`.
- `apps/mobile/src/features/dashboard/manager-dashboard-screen.test.tsx`
  - Team/date controls are only expected to invoke callbacks when manager options are available.
- `docs/task-tracker.md`
  - Week 5 explicitly keeps exports out of scope for manager dashboard work.
  - Week 7 export is implemented for admin users via the admin UI, not the manager dashboard.
- `docs/week-7-handoff.md`
  - Export is part of the admin layer.
  - Manager dashboard is preserved as aggregate-only and threshold-protected.
- Android wiring check
  - `apps/mobile/android/app/build.gradle` uses `com.wix.detox.DetoxJUnitRunner`.
  - `apps/mobile/android/build.gradle` includes the local Detox Maven repo.
  - `apps/mobile/android/app/src/androidTest/java/com/thenamak/MoodMarble/DetoxTest.java` exists.
  - `pnpm e2e:android:build` completed successfully.
  - Fresh build artifacts exist:
    - `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
    - `apps/mobile/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`

## Hypothesis Status
1. Team switching disabled because only one team is available in route params: supported by code evidence.
2. Export control is intentionally a placeholder in current implementation: confirmed by code and docs.
3. Android APK wiring is stale: rejected by successful rebuild and verified generated files.
4. Native routing drift is the cause of the web export/team behavior: not supported by the current evidence for this specific symptom.
5. Recent routing patches caused this exact web symptom: not supported by the current evidence for this specific symptom.
