# Week 3 Workspace Audit

## Scope

This audit records the current repository state for MoodMarble against the actual source of truth:

- `MoodMarble_Project_Specification.docx`
- `README.md`
- `docs/architecture.md`
- the current source tree under `apps/` and `packages/`
- the current backend and mobile test suites

The goal is to measure the repository against the real specification during the current Week 3 phase.

## Source of truth

The specification is now available at:

- `C:\Users\mauli\Documents\Projects\MoodMarble\MoodMarble_Project_Specification.docx`

The `.docx` defines itself as the single source of truth for:

- scope
- technology choices
- privacy rules
- API behavior
- delivery milestones
- testing expectations

## Specification requirements extracted from the `.docx`

### Product and role model

The specification defines three core product roles:

- team member
- manager
- admin

The MVP responsibilities implied by the spec are:

- team members submit anonymous moods quickly
- managers see aggregated team-level data only
- admins create and manage workspaces and teams
- personal mood history remains private on-device

### Core MVP features that must ship

Section `4.1` requires these MVP features:

- mood marble submission
- daily mood prompts
- personal mood history
- team mood dashboard
- workspace and team setup

These are definition-of-done features, not optional backlog ideas.

### Privacy and anonymity rules

The specification is strict on anonymity:

- no names
- no email addresses
- no visible login
- no profile photos
- no user identifiers in backend mood submissions
- no device ID or IMEI collection
- no GPS or location
- no IP address logging
- no raw free-text note storage on the backend
- no individual-level manager visibility

The mood submission payload sent to the backend may include:

- `workspace_id`
- `team_id`
- `mood_type`
- optional `tags`
- optional anonymous note
- `hour_of_day`

The backend may store only anonymised submission data. The spec explicitly says the backend must not store:

- device ID
- user ID
- IP address
- full timestamp

### Anonymous auth and session model

The specification requires:

- a device-generated UUID as the anonymous `device_token`
- the token is used only for rate limiting
- the token must never be stored in `mood_submissions`
- `POST /workspace/join` returns a signed device JWT
- `POST /mood` requires a device JWT
- manager endpoints require a manager JWT
- admin endpoints require an admin JWT
- JWT expiry is `30 days`
- rate limiting is `5 submissions per device per day`

### Dashboard and privacy-threshold behavior

The manager dashboard is required to include:

- daily mood heatmap
- weekly trend line
- mood distribution ring
- tag frequency chart
- mood alert banner
- submission volume

The backend must enforce:

- dashboard data appears only when a team has `5+ submissions` in the time window
- if a team has fewer than `5 members`, aggregated data is blurred into ranges
- managers cannot filter to a specific hour if fewer than `3 submissions` exist in that hour

### Personal history and notifications

The specification requires:

- local-only personal mood history
- timeline view grouped by day
- mood streak tracker
- mood calendar
- configurable daily prompts
- opt-out support
- notification schedules stored locally on-device

### Admin and workspace setup

The specification requires:

- admin-created workspaces with unique join codes
- team creation inside a workspace
- join-code based team member onboarding
- manager assignment to a team
- anonymised CSV export by date range

### Technology constraints

The specification requires the stack to be:

- free
- open-source
- buildable with no credit card required

It also specifies:

- Expo React Native mobile app
- TypeScript across mobile and backend
- Zustand
- Expo SecureStore plus AsyncStorage
- Reanimated 3
- Victory Native
- Expo Notifications
- NativeWind
- Lucide React Native
- Fastify
- Drizzle ORM
- PostgreSQL 16
- Redis
- custom JWT auth
- Zod
- Swagger
- GitHub Actions
- Expo EAS
- Railway or Render
- Neon or Supabase
- Upstash Redis
- Sentry free tier

### Testing and non-functional requirements

The specification requires:

- backend unit tests using `Jest + Supertest`
- frontend unit tests using `Jest + React Native Testing Library`
- backend coverage target `60% minimum`
- frontend coverage target `40% minimum`
- Detox E2E on key journeys
- manual testing across all 8 screens
- privacy audit including request inspection
- cold start under `2 seconds`
- submission round-trip under `500ms` on 4G
- dashboard load under `1.5 seconds`
- support for `10,000 submissions/day`
- graceful offline queue and sync
- HTTPS only
- no sensitive data in error responses
- `.env`-based configuration
- ESLint and Prettier via pre-commit hooks
- i18n-ready architecture using `i18next`

## Current implementation state

### Implemented and aligned

The current repository already satisfies these specification points:

- anonymous workspace join route exists
- join response includes a device JWT
- anonymous mood submission route exists
- backend verifies a device JWT for `POST /mood`
- JWT expiry is currently set to `30d`
- per-device daily rate limiting exists
- onboarding UI and team selection exist
- anonymous session persistence exists on mobile
- backend stores hashed notes instead of raw note text
- backend `mood_submissions` excludes device token and user identity fields
- mobile and backend both have active automated test suites

### Implemented but only partially aligned

The current repository partially matches the specification in these areas:

- the auth model uses a UUID inside the JWT payload, but the client does not yet expose a clear device-token lifecycle that matches the spec wording
- `team_members` exists in the database schema, but the join flow does not yet establish anonymous membership records
- workspace and team setup exists only as seeded data and lookup behavior, not as admin-managed product functionality
- mobile session persistence exists, but personal history persistence is not yet implemented
- the dashboard contracts exist in shared schemas, but the full manager flow does not
- documentation in `README.md` still reports Week 3 as upcoming even though part of Week 3 is already implemented

### Missing from the current repository

These specification requirements are not yet implemented in working code:

- daily mood prompts
- configurable prompt schedule UI
- personal history timeline
- mood streak tracking
- mood calendar
- manager dashboard endpoints
- dashboard widgets and charts
- dashboard privacy-threshold enforcement
- mood alert banner logic
- submission volume analytics view
- manager JWT flow
- admin JWT flow
- admin team creation API
- join code generation and management UI/API
- CSV export endpoint and admin UI flow
- manager assignment workflow
- offline queue and later sync
- settings screen
- i18n-ready string architecture
- Swagger route registration
- GitHub Actions CI/CD workflow
- Detox E2E coverage
- Expo EAS build workflow
- deployment automation
- Sentry integration
- pre-commit hooks for ESLint and Prettier

## Compliance and drift findings

### Week 3 milestone status

The specification says Week 3 should deliver:

- join code flow
- device JWT issuance
- onboarding screens
- workspace and team setup

Current status against that list:

- join code flow: implemented
- device JWT issuance: implemented
- onboarding screens: implemented
- workspace and team setup: partial only

### Technology drift

The repository is not fully aligned with the specified stack:

- backend testing uses Vitest, while the spec calls for Jest + Supertest
- the codebase does not yet show `i18next` wiring
- there are no visible GitHub Actions workflows beyond the placeholder
- Swagger dependencies are present, but Swagger is not wired into the backend app
- notification and dashboard dependencies described by the spec are not yet fully active in product flows

### Privacy-sensitive observations

The current code is generally privacy-aligned, but the following areas still need explicit completion:

- the device token lifecycle is not yet codified as a first-class anonymous session contract
- manager/admin auth and access boundaries are not implemented yet
- dashboard threshold rules are not yet enforced because dashboard endpoints do not exist
- offline queue behavior must be implemented carefully so no raw identifiers leak into synced payloads

## Test baseline

### Backend

- command: `pnpm test`
- result: `5` files passed, `37` tests passed

### Mobile

- command: `pnpm test --runInBand`
- result: `6` suites passed, `28` tests passed

## Week 3 conclusion

Based on the actual specification and the current repository state, MoodMarble is in a partial Week 3 state.

Week 3 work already present:

- anonymous join flow
- device JWT issuance
- onboarding UI
- anonymous mood submission foundation

Week 3 work still needed to reach a clean checkpoint:

- formalise the anonymous device-token and JWT session model end to end
- complete the workspace and team setup story in a spec-aligned way
- update repository documentation to match current implementation and remaining scope
- keep all future tasks aligned to the `.docx`, not the older repo-doc interpretation
