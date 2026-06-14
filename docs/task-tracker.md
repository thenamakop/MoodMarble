# MoodMarble Task Tracker

## Purpose

This tracker records the actionable work required to move MoodMarble from its current repository state to the exact MVP and milestone expectations defined by `MoodMarble_Project_Specification.docx`.

This file is version-controlled and should be updated as work changes state.

## Source boundary

This tracker is derived from:

- `MoodMarble_Project_Specification.docx`
- `README.md`
- `docs/architecture.md`
- current source code
- current automated tests

If repository docs conflict with the `.docx`, the `.docx` wins.

## Status scale

- `done`: implemented and verified in the current repository
- `partial`: implemented in part but incomplete or misaligned
- `pending`: required by the specification but not implemented yet

## Week 3 snapshot

### Done

- anonymous join-code flow
- device JWT issuance
- onboarding screen flow
- anonymous mood submission foundation

### Partial

- anonymous device-token lifecycle
- workspace and team setup
- repository documentation alignment

### Pending

- manager and admin auth scaffolding required by later endpoints
- explicit Week 3 sign-off criteria tied to the specification

## Active work items

### MM-W3-01 - Reconcile repository docs with the source-of-truth spec

- Status: `partial`
- Priority: `P0`
- Estimated effort: `small`
- Dependencies: none
- Scope: align `README.md`, `docs/architecture.md`, and tasking docs to the actual `.docx` requirements and the current implementation state
- Acceptance criteria:
- Week 3 is no longer described as entirely upcoming if code already implements part of it
- repo docs do not contradict the `.docx` on scope, privacy, or technology choices
- outstanding work is clearly separated from shipped behavior

### MM-W3-02 - Finalise anonymous device-token generation and storage

- Status: `partial`
- Priority: `P0`
- Estimated effort: `medium`
- Dependencies: none
- Scope: implement the device-generated UUID lifecycle exactly as specified, keeping it anonymous and limited to allowed flows
- Acceptance criteria:
- the device token is generated on-device
- the token is stored locally
- the token is used only for rate limiting and anonymous session flows
- the token is not treated as a user account or profile identifier
- the token is not written into `mood_submissions`
- automated tests cover generation and persistence

### MM-W3-03 - Finalise the device JWT session model

- Status: `partial`
- Priority: `P0`
- Estimated effort: `medium`
- Dependencies: `MM-W3-02`
- Scope: make the join-to-session flow explicit and fully test-covered for anonymous sessions
- Acceptance criteria:
- `POST /workspace/join` returns a signed device JWT
- mobile stores the session in a privacy-safe local store
- requests attach the JWT correctly
- JWT lifetime is `30 days`
- invalid, expired, or missing JWTs are rejected safely
- fallback behavior for missing token/session is defined and tested

### MM-W3-04 - Complete workspace and team setup for the MVP phase

- Status: `partial`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W3-03`
- Scope: close the remaining Week 3 gap around workspace and team setup without inventing non-spec account flows
- Acceptance criteria:
- workspace setup behavior is explicit
- team membership handling is explicit
- join code behavior remains anonymous and email-free
- manager assignment requirements are documented or implemented in the minimum spec-aligned way

### MM-W3-05 - Add Week 3 completion checklist

- Status: `pending`
- Priority: `P1`
- Estimated effort: `small`
- Dependencies: `MM-W3-01`, `MM-W3-02`, `MM-W3-03`, `MM-W3-04`
- Scope: create a concise sign-off checklist for closing Week 3 and entering Week 4
- Acceptance criteria:
- each Week 3 deliverable maps to code, tests, or an explicit unresolved gap
- open risks are documented
- the handoff to Week 4 is unambiguous

### MM-W4-01 - Implement local-only personal mood history storage

- Status: `pending`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W3-05`
- Scope: store personal mood history on-device only, never synced with any identifier
- Acceptance criteria:
- each local submission can be recorded for the current device
- data remains local only
- local history can be deleted from the device
- implementation uses the spec-aligned local storage approach

### MM-W4-02 - Build the history timeline screen

- Status: `pending`
- Priority: `P2`
- Estimated effort: `medium`
- Dependencies: `MM-W4-01`
- Scope: implement the scrollable by-day timeline view required by the specification
- Acceptance criteria:
- history is grouped by day
- users can scroll past submissions
- the screen exposes only device-local data

### MM-W4-03 - Add streak tracking and mood calendar

- Status: `pending`
- Priority: `P2`
- Estimated effort: `medium`
- Dependencies: `MM-W4-01`
- Scope: implement the remaining personal history features defined for Week 4
- Acceptance criteria:
- streak counter exists
- month calendar exists
- dominant mood per day is represented in the calendar

### MM-W5-01 - Implement aggregated dashboard backend endpoints

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W3-05`
- Scope: implement the dashboard endpoints required by the specification
- Acceptance criteria:
- `GET /dashboard/team/:teamId/daily` exists
- `GET /dashboard/team/:teamId/weekly` exists
- `GET /dashboard/team/:teamId/tags` exists
- responses are aggregated only
- no individual-level data is exposed

### MM-W5-02 - Enforce minimum anonymity thresholds

- Status: `pending`
- Priority: `P0`
- Estimated effort: `medium`
- Dependencies: `MM-W5-01`
- Scope: implement the spec-defined threshold protection rules for manager-visible data
- Acceptance criteria:
- teams with fewer than `5` submissions do not get standard dashboard output
- teams with fewer than `5` members return blurred ranges
- hour-level filtering is blocked below `3` submissions in that hour
- tests cover all threshold rules

### MM-W5-03 - Build the manager dashboard widgets

- Status: `pending`
- Priority: `P2`
- Estimated effort: `large`
- Dependencies: `MM-W5-01`, `MM-W5-02`
- Scope: implement the required manager-facing views and widgets from the specification
- Acceptance criteria:
- daily mood heatmap exists
- weekly trend line exists
- mood distribution ring exists
- tag frequency chart exists
- submission volume view exists
- mood alert banner logic is visible when thresholds are met

### MM-W5-04 - Add manager JWT authorization flow

- Status: `pending`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W5-01`
- Scope: implement only the spec-required authorization needed to protect dashboard endpoints
- Acceptance criteria:
- dashboard routes require a manager JWT
- manager access is team-scoped
- no personal account or profile flow is introduced beyond the specification

### MM-W6-01 - Implement daily mood prompts

- Status: `pending`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W4-01`
- Scope: implement local configurable notification reminders for mood check-ins
- Acceptance criteria:
- users can enable or disable prompts
- users can configure `1-3` reminder times per day
- reminder copy remains friendly and non-intrusive
- notification schedules remain device-local

### MM-W6-02 - Build the settings screen

- Status: `pending`
- Priority: `P2`
- Estimated effort: `medium`
- Dependencies: `MM-W6-01`
- Scope: add the settings surface defined in the spec
- Acceptance criteria:
- users can replay onboarding
- users can clear local data
- users can manage prompt settings

### MM-W6-03 - Implement offline queue and sync

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W3-03`, `MM-W4-01`
- Scope: satisfy the graceful offline behavior requirement in the non-functional specification
- Acceptance criteria:
- submissions can be queued locally while offline
- queued submissions sync when connectivity returns
- privacy rules remain intact during queue persistence
- tests cover queue and sync behavior

### MM-W7-01 - Implement admin team management and join-code APIs

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W3-04`
- Scope: implement the backend side of admin-controlled workspace and team setup
- Acceptance criteria:
- `POST /admin/team` exists
- join code generation or management behavior is explicit
- the flow remains account-light and spec-aligned

### MM-W7-02 - Implement anonymised CSV export

- Status: `pending`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W7-01`
- Scope: implement export behavior for admin users without leaking identity
- Acceptance criteria:
- `GET /admin/workspace/:id/export` exists
- export supports date-range filtering
- exported data is anonymised

### MM-W7-03 - Build the admin panel

- Status: `pending`
- Priority: `P2`
- Estimated effort: `large`
- Dependencies: `MM-W7-01`, `MM-W7-02`
- Scope: implement the admin UI screens required by the specification
- Acceptance criteria:
- create/edit team flow exists
- join code can be viewed or copied
- export action is reachable from the UI

### MM-W7-04 - Add admin JWT authorization flow

- Status: `pending`
- Priority: `P1`
- Estimated effort: `medium`
- Dependencies: `MM-W7-01`, `MM-W7-02`
- Scope: implement the authorization required to protect admin endpoints
- Acceptance criteria:
- admin routes require an admin JWT
- admin access is isolated from member and manager flows

### MM-W8-01 - Align backend test tooling with the specification

- Status: `pending`
- Priority: `P2`
- Estimated effort: `medium`
- Dependencies: `MM-W5-04`, `MM-W7-04`
- Scope: decide whether to adopt `Jest + Supertest` as specified or formally resolve the tooling drift with the project owner
- Acceptance criteria:
- backend test strategy is explicitly aligned to the source-of-truth spec
- route and anonymity coverage targets remain measurable

### MM-W8-02 - Add E2E coverage for key journeys

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W4-03`, `MM-W5-03`
- Scope: cover the key user journeys named in the specification
- Acceptance criteria:
- onboarding to submit mood to view history journey is covered
- manager dashboard journey is covered if the dashboard exists
- E2E setup is runnable in the repository

### MM-W8-03 - Add CI/CD and deployment readiness

- Status: `pending`
- Priority: `P1`
- Estimated effort: `large`
- Dependencies: `MM-W8-01`, `MM-W8-02`
- Scope: satisfy the delivery requirements in the source-of-truth spec
- Acceptance criteria:
- GitHub Actions workflow exists
- Expo EAS build path is configured
- deployment path for backend is documented
- README includes setup, environment, and deployment steps

### MM-X-01 - Wire Swagger documentation

- Status: `pending`
- Priority: `P3`
- Estimated effort: `small`
- Dependencies: `MM-W5-01`, `MM-W7-01`
- Scope: activate the API documentation tooling required by the specification
- Acceptance criteria:
- Swagger route is available
- docs match implemented route schemas

### MM-X-02 - Add i18n-ready string architecture

- Status: `pending`
- Priority: `P3`
- Estimated effort: `medium`
- Dependencies: `MM-W3-05`
- Scope: satisfy the maintainability and internationalisation requirement without expanding user-visible scope beyond English-only v1
- Acceptance criteria:
- app strings are centralised
- architecture is ready for `i18next`
- English remains the only shipped locale for v1

### MM-X-03 - Add pre-commit lint and format enforcement

- Status: `pending`
- Priority: `P3`
- Estimated effort: `small`
- Dependencies: none
- Scope: satisfy the maintainability requirement for ESLint and Prettier via pre-commit hooks
- Acceptance criteria:
- lint and format hooks run before commit
- environment-specific assumptions are documented

## Dependency map

- `MM-W3-02` must land before the full session model in `MM-W3-03`
- `MM-W3-05` gates a clean handoff from Week 3 into Weeks 4 and 5
- `MM-W4-01` is the base for history, streaks, settings, and offline queueing
- `MM-W5-01` is the base for threshold enforcement and dashboard UI
- `MM-W5-04` is the base for protected manager access
- `MM-W7-01` is the base for export and admin UI work
- `MM-W7-04` is the base for admin route protection
- `MM-W8-03` depends on feature maturity across Weeks 5 through 7

## Coverage check against the specification

This tracker covers every major requirement area defined in the `.docx`:

- anonymous submission
- daily prompts
- personal history
- dashboard analytics
- anonymity thresholds
- workspace and team setup
- admin flows
- testing and quality gates
- deployment and infrastructure
- non-functional and maintainability requirements

## Duplicate elimination notes

The following overlaps were intentionally merged:

- dashboard endpoint work is grouped in `MM-W5-01`
- dashboard privacy rules are grouped in `MM-W5-02`
- dashboard visual widgets are grouped in `MM-W5-03`
- daily prompts and notification configuration are grouped in `MM-W6-01`
- CI, EAS, and deployment readiness are grouped in `MM-W8-03`

## Next update rule

When a task changes state:

- update its `Status`
- keep acceptance criteria tied to the `.docx`
- avoid adding scope not stated in the specification
- note any privacy-impacting ambiguity before implementation starts
