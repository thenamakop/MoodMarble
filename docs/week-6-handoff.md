# Week 6 Handoff

## Purpose

This handoff freezes the verified Week 5 repository state and defines the exact Week 6 implementation boundary before any settings or reminder code begins.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

Week 6 work must also honor the verified repository state that already preserves:

- the Week 3 anonymous onboarding and submission flow
- the Week 4 local-only personal history flow
- the Week 5 manager dashboard and privacy-threshold enforcement

## Checkpoint created before changes

The repository checkpoint branch created from the verified Week 5 base is:

- `week6/verified-week5-base`

Week 6 scope work continues from `master`.

## Verified baseline that remains stable

The following product areas are already implemented and must remain behaviorally stable through Week 6:

- anonymous onboarding, join-code entry, and team selection
- secure anonymous session persistence and restart recovery
- mood submission through the existing marble tray flow
- local-only personal history timeline, calendar, and streak tracking
- manager dashboard routes, charts, and privacy-threshold behavior

These stable areas are currently represented by code in:

- `apps/mobile/src/features/onboarding/`
- `apps/mobile/src/features/mood-submission/`
- `apps/mobile/src/features/history/`
- `apps/mobile/src/features/dashboard/`
- `apps/backend/src/routes/dashboard-daily.ts`
- `apps/backend/src/routes/dashboard-weekly.ts`
- `apps/backend/src/routes/dashboard-tags.ts`
- `apps/backend/src/services/dashboard-privacy.ts`

## Week 6 scope only

Week 6 is strictly limited to local device settings and daily mood reminder prompts.

The allowed implementation scope is:

- local reminder settings stored on-device only
- local notification permission handling and schedule orchestration
- configurable daily reminder prompts with `1-3` reminder times
- a settings screen to manage reminder preferences
- replaying onboarding from settings without changing the onboarding content itself
- local data deletion for device-stored member data only
- the smallest route wiring needed to reach settings-related screens

Reminder behavior must remain privacy-safe:

- reminder schedules stay device-local
- no reminder state is sent to the backend
- no new identity model is introduced
- no personal history is exposed outside the device

## Out of scope for Week 6

Do not change or begin:

- dashboard analytics, widgets, or manager workflows
- admin tooling or admin-facing routes
- export flows
- offline queueing or sync
- new backend analytics work
- new auth or identity models
- personal history sync or cross-device restore
- any Week 7 or later work unless a defect forces the smallest possible fix

`MM-W6-03` in `docs/task-tracker.md` stays out of scope for this freeze.

## Expected affected modules

Week 6 work should stay within these narrow mobile-only areas unless a bug forces a minimal fix:

- `apps/mobile/src/app/`
- `apps/mobile/src/components/app-tabs.tsx`
- `apps/mobile/src/components/app-tabs.web.tsx`
- `apps/mobile/src/features/onboarding/session.ts`
- `apps/mobile/src/features/history/storage.ts`

The expected new or expanded feature modules are:

- `apps/mobile/src/features/settings/` for the settings screen and local settings actions
- `apps/mobile/src/features/notifications/` for permission checks, schedule normalization, and reminder orchestration
- a small route entry such as `apps/mobile/src/app/settings.tsx`

The expected local persistence utilities are limited to device-stored data only:

- anonymous session clearing through `apps/mobile/src/features/onboarding/session.ts`
- local history clearing through `apps/mobile/src/features/history/storage.ts`
- reminder settings storage in a new mobile-only settings or notifications utility

No backend or shared-contract files should change for Week 6 unless a defect blocks the local-first implementation directly.

## Freeze boundary

The following areas are explicitly frozen for this sprint and should remain unchanged unless a bug forces a minimal fix:

- `apps/mobile/src/features/onboarding/onboarding-screen.tsx`
- `apps/mobile/src/features/mood-submission/`
- `apps/mobile/src/features/history/model.ts`
- `apps/mobile/src/features/history/history-screen.tsx`
- `apps/mobile/src/features/history/timeline-screen.tsx`
- `apps/mobile/src/features/history/calendar-screen.tsx`
- `apps/mobile/src/features/dashboard/`
- `apps/backend/src/routes/`
- `apps/backend/src/services/`
- `packages/shared/`

Week 6 must preserve the current Week 3, Week 4, and Week 5 behavior exactly unless a tightly scoped defect blocks settings or reminders.

## Readiness proof for Week 6

The repository is ready for Week 6 when the following remain green after this freeze commit:

- the existing mobile tests for onboarding, session recovery, and marble submission
- the existing mobile tests for local history, streaks, and calendar behavior
- the existing mobile tests for manager route protection and dashboard rendering
- the existing backend dashboard route and privacy tests
- the worktree is clean apart from the intentional Week 6 freeze documentation change
