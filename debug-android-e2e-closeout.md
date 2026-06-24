# Debug Session: android-e2e-closeout
- **Status**: [OPEN]
- **Issue**: Close the remaining Android E2E/testing blockers by proving the live Detox path works with backend + Metro, and by identifying which build/runtime warnings are fixable in-repo versus third-party/tooling-only noise.
- **Debug Server**: Pending start
- **Log File**: .dbg/trae-debug-log-android-e2e-closeout.ndjson

## Reproduction Steps
1. Start backend and Metro with the current repo state.
2. Run `pnpm e2e:android:preflight`.
3. Run `pnpm e2e:android:build`.
4. Run `pnpm e2e:android:test`.
5. Capture failing runtime/build warnings and classify repo-fixable vs external.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The remaining blocker is now only live-runtime launch/order, not Android build configuration. | High | Medium | Pending |
| B | `pnpm e2e:android:test` still fails because Metro/backend readiness is not synchronized tightly enough for Detox bootstrap. | High | Medium | Pending |
| C | At least one of the remaining warnings can be eliminated in repo scripts by setting missing environment/process options during build/test execution. | Medium | Medium | Pending |
| D | The dirty worktree contains unrelated local artifacts, but no scoped repo regression is required to achieve a full live Android pass. | Medium | Low | Pending |

## Log Evidence
- Existing NDJSON evidence confirms the targeted emulator is `Pixel_8` and the helper is attempting the dev-client bootstrap URL.
- Workspace status still includes unrelated dirty files outside the intended E2E scope; avoid sweeping them into this fix.
- Current investigation focus is narrowed to live runtime handoff and remaining repo-fixable warnings.

## Verification Conclusion
Pending.

## 2026-06-23 Continuation Notes
- Re-opened the existing session instead of creating a new one because this bug investigation is a direct continuation of the prior `android-e2e-closeout` workflow.
- Refined active hypotheses:
  - A: Detox launches the process but fails to foreground the Expo runtime.
  - B: The Expo dev-client server picker still intermittently interrupts bootstrap.
  - C: The app reaches process start but stalls before any ready-state test id is rendered.
  - D: At least one remaining warning is still fixable in repo scripts.
  - E: Dirty-tree noise is unrelated to the live Android E2E blocker.
