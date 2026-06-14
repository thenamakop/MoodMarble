# MoodMarble Task Tracker

## Purpose

This tracker records the actionable work required to move MoodMarble from the current repository state toward the documented MVP and milestone plan.

This file is version-controlled so progress can be updated in-place as work is completed.

## Source boundary

This tracker is based on repository evidence only:

- `docs/architecture.md`
- `README.md`
- current source code
- current tests

The actual `MoodMarble_Project_Specification.docx` is not present in the workspace, so this tracker must be revalidated once the real specification is added.

## Status scale

- `done`: implemented and verified in the current repository
- `partial`: implemented in part, but still incomplete or misaligned
- `pending`: documented but not yet implemented
- `blocked`: cannot be closed until the real specification is available

## Week 3 snapshot

### Done

- workspace join route exists
- device JWT issuance exists
- onboarding UI exists
- mood submission flow exists

### Partial

- anonymous auth and session model is implemented, but not fully codified against the documented device-token lifecycle
- workspace and team setup is only seeded, not fully managed through product flows
- documentation does not reflect the current implementation state

### Blocked

- source-of-truth validation against the missing `.docx` specification

## Active work items

### MM-W3-01 - Recover and ingest the real specification

- Status: `blocked`
- Priority: `P0`
- Estimated effort: `small`
- Dependencies: none
- Scope: add the real `MoodMarble_Project_Specification.docx` to the project workspace or otherwise make it accessible for review
- Acceptance criteria:
- the real `.docx` is available in the workspace
- all tracker items are revalidated against the actual source of truth
- any repo-doc drift against the `.docx` is captured explicitly

### MM-W3-02 - Reconcile documentation with implementation

- Status: `partial`
- Priority: `P0`
- Estimated effort: `small`
- Dependencies: `MM-W3-01`
- Scope: align `README.md` and supporting docs with the actual state of onboarding, join flow, and device JWT support already present in code
- Acceptance criteria:
- Week 3 status is reported consistently across repository docs
- implemented features are no longer listed as merely upcoming
- any features that remain pending are clearly separated from shipped functionality

### MM-W3-03 - Finalise the anonymous auth and session model

- Status: `partial`
- Priority: `P0`
- Estimated effort: `medium`
- Dependencies: `MM-W3-01`
- Scope: define the device-token and device-JWT lifecycle in code and tests without introducing accounts, profiles, or PII
- Acceptance criteria:
- token creation point is explicit
- token storage point is explicit
- request attachment rules are explicit
- JWT validity window matches the documented 30-day lifetime
- invalid, expired, or missing JWT behavior is covered by tests
- the device token is not treated as a user profile or account identity
- no raw identifier reaches `mood_submissions`

### MM-W3-04 - Complete anonymous workspace and team membership setup

- Status: `partial`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W3-03`
- Scope: decide how `team_members` is meant to participate in the anonymous join flow and implement only the documented requirement
- Acceptance criteria:
- the join flow either manages membership explicitly or the table is documented as intentionally unused for MVP
- team selection and workspace scope are validated consistently
- privacy guarantees remain intact

### MM-W3-05 - Add Week 3 completion checks

- Status: `pending`
- Priority: `P1`
- Estimated effort: `small`
- Dependencies: `MM-W3-02`, `MM-W3-03`, `MM-W3-04`
- Scope: define the exact verification checklist for closing Week 3 without relying on implied scope
- Acceptance criteria:
- each Week 3 milestone item maps to code, tests, or an explicit blocker
- open gaps are visible in one place
- the repository can be advanced to Week 4 with a clear handoff

### MM-W4-01 - Build local-only personal mood history

- Status: `pending`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W3-05`
- Scope: add local-only storage and retrieval for personal history with no backend exposure
- Acceptance criteria:
- submitted moods are available in a local history view
- no personal history data is uploaded to the backend
- storage can be cleared locally

### MM-W4-02 - Add timeline, calendar, and streak tracking

- Status: `pending`
- Priority: `P2`
- Estimated effort: `medium`
- Dependencies: `MM-W4-01`
- Scope: build the documented history presentation and streak features on top of local-only data
- Acceptance criteria:
- timeline view exists
- mood calendar exists
- streak counter exists
- all features use device-local data only

### MM-W5-01 - Implement aggregated dashboard backend endpoints

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W3-05`
- Scope: implement the documented daily, weekly, and tags dashboard endpoints using aggregated data only
- Acceptance criteria:
- `GET /dashboard/team/:teamId/daily` exists
- `GET /dashboard/team/:teamId/weekly` exists
- `GET /dashboard/team/:teamId/tags` exists
- shared response schemas are enforced
- no individual records are exposed

### MM-W5-02 - Enforce dashboard privacy thresholds

- Status: `pending`
- Priority: `P0`
- Estimated effort: `medium`
- Dependencies: `MM-W5-01`
- Scope: enforce the documented visibility thresholds for low-volume and low-member-count cases
- Acceptance criteria:
- fewer than 5 submissions results in protected output
- fewer than 5 team members results in blurred output
- fewer than 3 submissions in an hour prevents hour-level drill-down
- tests cover each threshold rule

### MM-W5-03 - Build the manager dashboard UI

- Status: `pending`
- Priority: `P2`
- Estimated effort: `large`
- Dependencies: `MM-W5-01`, `MM-W5-02`
- Scope: add the documented aggregated chart views without exposing individual mood entries
- Acceptance criteria:
- daily view exists
- weekly trend view exists
- top tags view exists
- low-sample privacy behavior is visible in the UI

### MM-W6-01 - Add daily prompts and settings

- Status: `pending`
- Priority: `P2`
- Estimated effort: `medium`
- Dependencies: `MM-W4-01`
- Scope: implement local reminder scheduling and a settings surface for prompt preferences
- Acceptance criteria:
- users can configure or disable reminders
- reminder settings stay on-device
- settings include local data deletion and onboarding replay if still required by docs

### MM-W6-02 - Implement offline queue and sync

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W3-03`, `MM-W4-01`
- Scope: meet the documented offline behavior target by queueing mood submissions locally and syncing them later
- Acceptance criteria:
- offline submissions are retained locally
- queued submissions sync when connectivity returns
- duplicate submission handling is defined by tests
- privacy rules remain intact during queue persistence

### MM-W7-01 - Build admin APIs for workspace and team management

- Status: `pending`
- Priority: `P2`
- Estimated effort: `large`
- Dependencies: `MM-W3-01`
- Scope: add only the documented admin capabilities for team creation, join code management, and anonymised export
- Acceptance criteria:
- admin team creation flow exists
- workspace export flow exists
- join code management behavior is explicit
- exported data remains anonymous

### MM-W7-02 - Build admin UI

- Status: `pending`
- Priority: `P3`
- Estimated effort: `large`
- Dependencies: `MM-W7-01`
- Scope: implement the documented admin panel screens needed to use the Week 7 backend capabilities
- Acceptance criteria:
- admin panel exists
- team management UI exists
- export flow is reachable
- privacy-safe messaging is used throughout

### MM-W8-01 - Add CI, E2E, and deployment readiness

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W5-03`, `MM-W6-01`, `MM-W6-02`, `MM-W7-02`
- Scope: close the documented testing and delivery gaps before MVP completion
- Acceptance criteria:
- GitHub Actions workflow exists
- Detox E2E covers the documented key journeys
- performance checks are recorded
- deployment steps are documented and working
- definition-of-done items are all measurable

### MM-X-01 - Wire Swagger or OpenAPI documentation

- Status: `pending`
- Priority: `P3`
- Estimated effort: `small`
- Dependencies: `MM-W5-01`, `MM-W7-01`
- Scope: register API documentation tooling already listed in backend dependencies and docs
- Acceptance criteria:
- API docs route is available
- route contracts match shared schemas

## Dependency map

- `MM-W3-01` gates all source-of-truth validation
- `MM-W3-03` gates auth-sensitive work and offline sync
- `MM-W3-05` gates clean transition into Week 4 and Week 5
- `MM-W4-01` is the base for history, streaks, settings, and local deletion
- `MM-W5-01` is the base for privacy-threshold enforcement and dashboard UI
- `MM-W7-01` is the base for the admin UI
- `MM-W8-01` depends on major feature completion across Weeks 5 through 7

## Coverage check against repository requirements

The current tracker covers every major requirement category documented in the repository:

- privacy and anonymity rules
- onboarding and anonymous auth
- submission flow
- personal history
- dashboard aggregation
- notifications and settings
- admin tooling and export
- testing, CI, deployment, and performance

## Duplicate elimination notes

The following overlaps were merged into single tracked items:

- dashboard daily, weekly, and tags backend work was grouped under `MM-W5-01`
- reminder scheduling and settings surface work was grouped under `MM-W6-01`
- CI, E2E, performance audit, and deployment readiness were grouped under `MM-W8-01`

## Next update rule

When a task changes state:

- update its `Status`
- add or refine dependencies if scope changes
- keep acceptance criteria tied to documented requirements only
- re-run the coverage check if the real specification `.docx` becomes available
