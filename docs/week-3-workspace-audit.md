# Week 3 Workspace Audit

## Scope

This audit records the current repository state for MoodMarble during the Week 3 phase.

It is based on:

- `README.md`
- `docs/architecture.md`
- the current source tree under `apps/` and `packages/`
- the current test suites in `apps/backend/tests` and `apps/mobile/src/**/__tests__`-style files

## Specification blocker

The repository does not currently contain the actual `MoodMarble_Project_Specification.docx` file.

Observed state:

- a Word temporary lock file was present as `~$odMarble_Project_Specification.docx`
- that temporary file was deleted from the worktree on request
- no non-temporary `MoodMarble_Project_Specification.docx` file was found under `C:\Users\mauli\Documents`

Result:

- full `.docx` line-by-line extraction is blocked
- all findings below are limited to the evidence available in the repository
- any future check against the real specification must revisit this audit

## Requirements found in repository documentation

### Privacy and compliance rules

Repository docs consistently require:

- no names
- no email addresses
- no user profiles
- no GPS or location
- no device identifiers in mood submissions
- no IP logging
- no raw note text stored on the backend
- no individual manager visibility into mood entries
- personal mood history stored on-device only

### Functional expectations

The documented MVP includes:

- anonymous workspace join by 6-character code
- anonymous mood submission
- optional tags
- optional mood notes
- personal mood history
- mood streak tracking
- daily prompts and reminders
- manager dashboard views for daily, weekly, and tags
- admin tools for team management, join code management, and anonymised CSV export

### Authentication and session expectations

The repository docs define:

- an anonymous `device_token`
- a device JWT for mood submission
- a manager JWT for dashboard access
- an admin JWT for workspace and team management
- JWT expiry of 30 days
- rate limiting of 5 submissions per device per day

### Performance and delivery expectations

Repository docs define these targets:

- app cold start under 2 seconds
- submission round-trip under 500ms on 4G
- dashboard load under 1.5 seconds
- backend scale target up to 10,000 submissions per day
- uptime target of 99.5%
- offline queue and later sync
- backend coverage minimum 60%
- frontend coverage minimum 40%
- Detox coverage for key journeys before MVP completion

### Milestone expectations

The architecture document maps work into weekly milestones:

- Week 1: setup and architecture
- Week 2: core submission flow
- Week 3: onboarding and auth
- Week 4: personal history
- Week 5: dashboard
- Week 6: notifications and settings
- Week 7: admin panel and export
- Week 8: polish, testing, and deployment

## Current implementation state

### Implemented and verified

The current codebase already implements the following:

- anonymous workspace join route
- device JWT issuance on join
- device JWT verification on mood submission
- onboarding screen and team selection
- anonymous mobile session persistence
- anonymous mood submission route
- mood validation against shared schemas
- per-device daily rate limiting
- note hashing before persistence
- absence of raw note text and device token fields in `mood_submissions`

### Implemented but only partially aligned to documented intent

The following areas exist but are not yet fully aligned with the documented model:

- Week 3 appears partially completed in code, while `README.md` still marks it as upcoming
- the backend schema includes `team_members`, but the join flow does not create or update membership records
- the current join flow issues a fresh device JWT without a persistent device token lifecycle on the client
- the mobile session stores `workspaceId`, `teamId`, and `deviceJwt`, but there is no explicit device-token management flow on-device
- the documented manager and admin JWT models are not implemented in backend routing

### Documented but not implemented

The following documented areas do not currently exist in working code:

- manager dashboard endpoints
- manager dashboard UI
- privacy threshold enforcement for dashboard visibility
- personal history timeline
- mood calendar
- streak tracking
- daily prompt scheduling
- settings screen
- offline queue and sync flow
- admin routes
- admin UI
- CSV export flow
- Swagger or OpenAPI route registration
- GitHub Actions workflows
- Detox E2E coverage
- deployment automation

## Test baseline

### Backend

- command: `pnpm test`
- result: 5 test files passed, 37 tests passed

### Mobile

- command: `pnpm test --runInBand`
- result: 6 test suites passed, 28 tests passed

## Drift and risks already visible

- the real specification `.docx` is missing, so source-of-truth validation is incomplete
- `README.md` status does not match the actual implementation state
- architecture docs describe a larger MVP than the shipped code supports today
- backend test tooling uses Vitest, while the architecture document still says Jest + Supertest
- mobile dependencies and documented technology choices are not fully aligned in every area

## Week 3 conclusion

Based on repository evidence alone, MoodMarble is not at a clean Week 3 checkpoint yet.

The join and onboarding foundation exists, but the repository still needs:

- source-of-truth specification recovery
- documentation alignment
- a clarified anonymous auth and session model
- explicit completion criteria for remaining Week 3 work
- a tracked plan for Weeks 4 through 8
