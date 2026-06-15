# Week 4 Handoff

## Purpose

This handoff records the repository state at the end of Week 3 and defines the clean starting point for Week 4, `Personal Mood History`.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

If any repository note conflicts with the `.docx`, the `.docx` wins.

## Week 3 complete and stable

The following Week 3 areas are implemented and verified:

- 3-slide onboarding flow
- anonymous join-code entry
- workspace-scoped team selection
- device-generated anonymous token creation and persistence
- signed device JWT issuance from `POST /workspace/join`
- secure session persistence on mobile
- restart recovery for valid sessions
- graceful fallback to onboarding when the session is missing, invalid, or expired
- anonymous route protection for the current team-member flow
- privacy-safe error handling for join and mood submission flows

## Privacy position at handoff

The current Week 3 product path remains aligned with the specification:

- no email flow
- no password flow
- no social login
- no user profile objects
- no raw device token in backend mood submissions
- no raw identifiers stored in the mood submission record
- no raw note text stored on the backend
- no dashboard, history, notifications, or admin product flow exposed in the Week 3 UI

## Verified supporting code ready for Week 4

The following supporting code is now ready to support local-only personal history work:

- `apps/mobile/src/features/onboarding/session.ts`
- `apps/mobile/src/features/onboarding/session-boundary.ts`
- `apps/mobile/src/features/onboarding/device-token.ts`
- `apps/mobile/src/features/onboarding/device-jwt.ts`
- `apps/mobile/src/features/onboarding/route-boundary.ts`
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/features/mood-submission/marble-tray-screen.tsx`
- `packages/shared/schemas.ts`

These pieces provide:

- stable anonymous session context on-device
- a verified workspace and team context for the current device
- a protected team-member entry path
- a stable submission foundation without adding a login model

## Week 4 entry rule

Week 4 should start with local-only personal history storage only.

That means the next increment should:

- store personal history on-device only
- avoid adding new backend fields for personal history
- avoid changing the anonymous join or session model unless a defect blocks Week 4 directly
- keep history tied to the current device session context without turning the device token into a user profile

## Do not start yet

The following work is not part of the first Week 4 increment and should not be started in the handoff branch:

- manager dashboard routes or widgets
- dashboard privacy-threshold logic
- notification scheduling UI
- admin APIs or admin UI
- export flows
- offline queueing and sync
- new auth models or role systems beyond the current anonymous member boundary

## Remaining non-blocking gaps

These items remain outside the Week 4 start gate and do not block local history work:

- workspace and team setup is still seeded and lookup-based rather than admin-managed
- repository documentation alignment is improved but not fully complete across every long-form document
- manager and admin auth remain future work
- backend test tooling still differs from the specification's `Jest + Supertest` wording

## Recommended Week 4 first task

Start with `MM-W4-01` from `docs/task-tracker.md`:

- implement local-only personal mood history storage
- verify that stored history never introduces PII
- verify that local history never adds raw identifiers to backend mood payloads
