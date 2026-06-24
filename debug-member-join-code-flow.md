# [OPEN] Debug Session: member-join-code-flow

## Summary
- Symptom: member onboarding Detox flow intermittently stalls around join-code submission and team selection.
- Requested focus: verify whether `ABC123` is already present, whether Detox enters it correctly, whether the Continue button is pressed, and then continue fixing the member onboarding E2E.
- Constraint: preserve product behavior until runtime evidence identifies the root cause.

## Hypotheses
1. Detox enters `ABC123`, but the join CTA is not visible or not actually tapped when the keyboard/focus state changes.
2. The join CTA tap happens, but the onboarding screen rejects or ignores the request because the input state is stale when `replaceText()` completes.
3. The join request succeeds, but the team picker renders off-screen or behind a transient loading state, so Detox times out before `team-option-tm_product` becomes visible.
4. Local persisted onboarding state sometimes pre-fills or partially advances the flow, causing `resetToOnboardingIfNeeded()` to land in an unexpected screen state before the member test runs.
5. The Expo dev client/runtime bootstrap timing causes the first interaction after launch to race with hydration, so the join-code screen looks ready before it is truly interactive.

## Evidence Plan
- Inspect onboarding screen logic for join-code input, Continue button enablement, and team selection rendering.
- Add runtime instrumentation only around onboarding input/tap/state transitions.
- Reproduce with targeted Detox runs and compare pre-fix logs against post-fix logs.

## Status
- State: collecting baseline evidence
- Business-logic fixes: not started

## Evidence
- Pre-fix runtime log: `.dbg/trae-debug-log-member-join-code-flow.ndjson`

## Hypothesis Verification
| ID | Hypothesis | Status | Evidence Summary |
|----|------------|--------|------------------|
| A | Detox enters `ABC123`, but the join CTA is not visible or not actually tapped. | REJECTED | Log lines 2-4 and 8 show Detox replaced the text and tapped `join-workspace-button`. |
| B | The join CTA tap happens, but the input state is stale when the join action runs. | REJECTED | Log line 6 shows `handleJoinWorkspace()` received `joinCode: "ABC123"` and `normalizedJoinCode: "ABC123"`. |
| C | The join request succeeds, but the onboarding screen rejects or ignores the transition. | REJECTED | Log lines 7, 10, and 11 show `/workspace/join` returned `200` and `handleJoinWorkspace()` stored the workspace result. |
| D | The team picker renders off-screen or behind a transient state. | REJECTED | Log lines 12-13 show `workspaceResult` arrived and `selectedTeamId` became `tm_product`. |
| E | App bootstrap timing leaves the screen non-interactive. | INCONCLUSIVE | This run reached team selection and then failed later in the marble tray scroll step. |

## Root Cause Direction
- The join-code path is functioning correctly in this reproduction.
- The current first failing stage is the marble tray scroll helper in `apps/mobile/e2e/member-journey.e2e.cjs`, not the onboarding join flow.
