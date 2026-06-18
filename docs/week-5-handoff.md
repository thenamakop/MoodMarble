# Week 5 Handoff

## Purpose

This handoff freezes the verified Week 4 repository state and defines the exact Week 5 implementation boundary before any dashboard code begins.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Checkpoint created before changes

The repository checkpoint branch created from the verified Week 4 base is:

- `week5/verified-week4-base`

Week 5 scope work continues from `master`.

## Week 4 complete and stable

The current repository already contains the Week 4 local-history layer:

- `apps/mobile/src/app/history.tsx`
- `apps/mobile/src/features/history/history-screen.tsx`
- `apps/mobile/src/features/history/timeline-screen.tsx`
- `apps/mobile/src/features/history/calendar-screen.tsx`
- `apps/mobile/src/features/history/storage.ts`
- `apps/mobile/src/features/history/streak.ts`

These pieces confirm that Week 4 now provides:

- local-only personal mood history on-device
- a private timeline view
- a private calendar view
- streak tracking from local history data
- no new backend identity or history sync model

## Week 5 scope only

Week 5 is strictly limited to the manager-facing dashboard and aggregate analytics sprint.

The allowed implementation scope is:

- manager-facing aggregate analytics only
- backend dashboard endpoints for daily, weekly, and tag views
- privacy-threshold enforcement exactly as required by the specification
- a dashboard UI shell for manager-facing aggregated views

All manager-visible data must remain aggregated only.

The threshold rules that must be enforced exactly are:

- dashboard data appears only with `5+ submissions` in the selected time window
- teams with fewer than `5` members return blurred ranges
- hour-level drill-down is blocked below `3` submissions in that hour

## Out of scope for Week 5

Do not change or begin:

- onboarding flow
- anonymous session persistence or recovery
- mood submission contracts or pipeline
- local-only personal history implementation
- notifications or settings work
- admin tooling
- export flows
- offline queueing or sync
- any new identity model unless a bug forces a minimal fix

## Expected affected modules

Week 5 work should stay within these narrow areas:

- `apps/backend/src/app.ts`
- `apps/backend/src/routes/`
- `apps/backend/src/services/`
- `apps/backend/tests/routes/`
- `apps/backend/tests/services/`
- `packages/shared/schemas.ts`
- `packages/shared/types.ts`
- `packages/shared/index.ts`
- `apps/mobile/src/app/`
- `apps/mobile/src/components/`
- `apps/mobile/src/features/`

The intended additions are limited to dashboard-specific route, service, contract, and UI-shell files inside those areas.

## Freeze boundary

The following areas are explicitly frozen for this sprint and should remain unchanged unless a bug forces a minimal fix:

- `apps/mobile/src/features/onboarding/`
- `apps/mobile/src/features/mood-submission/`
- `apps/mobile/src/features/history/`
- `apps/backend/src/routes/mood.ts`
- `apps/backend/src/routes/workspace-join.ts`
- `apps/backend/src/services/mood-submissions.ts`
- `apps/backend/src/services/submission-rate-limit.ts`
- `apps/backend/src/services/workspace-join.ts`
- `apps/backend/src/services/workspace-directory.ts`

## Readiness proof for Week 5

The repository is ready for Week 5 when the following remain green after this freeze commit:

- the existing backend route and service tests for anonymous join and mood submission
- the existing mobile tests for local history, streaks, calendar, and marble submission
- the worktree is clean apart from the intentional Week 5 freeze documentation changes
