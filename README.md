# MoodMarble

> Privacy-first anonymous team mood tracking for workplace wellbeing.

MoodMarble lets team members join a workspace without accounts, submit a mood in seconds, keep a personal on-device history, and lets managers view aggregate trends without exposing individual responses.

## Verified Repository Status

This README reflects the verified repository state through the completed Week 6 work.

- Implemented: anonymous onboarding and mood submission, local personal history, manager dashboard analytics, and local reminder/settings flows
- Stable and intentionally preserved: Week 3 member onboarding, Week 4 local history, Week 5 manager dashboard, Week 6 notifications/settings
- Not implemented yet: Week 7 admin panel, admin JWT flow, workspace creation UI, team management UI, join-code management UI, anonymized CSV export

## Current Product Scope

### Team member features

- Anonymous join by workspace join code
- Team selection inside the joined workspace
- Secure device-local anonymous session restore
- Mood submission with one mood, up to two tags, and an optional short note
- Local-only personal mood timeline
- Local-only streak tracking
- Local-only monthly calendar view with previous and next month navigation
- Exact local timestamp display for saved personal history entries
- Local settings for reminder times, onboarding replay, and device-local data deletion

### Manager features

- Manager dashboard route and aggregate chart rendering
- Daily, weekly, and tag-based team analytics
- Privacy-threshold enforcement:
  - dashboard views require at least 5 submissions in the selected window
  - teams smaller than 5 members return blurred ranges
  - hour-level detail is blocked below 3 submissions in that hour
- Manager JWT protected dashboard endpoints

### Admin and export status

These spec-aligned features are planned next, but are not implemented in the current verified repo state:

- Workspace creation
- Team management
- Join code generation and management
- Admin JWT authorization
- Anonymized CSV export

## Privacy Guarantees

- No names, email addresses, or personal profiles
- No individual manager visibility into member mood submissions
- Personal history stays on the current device
- Reminder preferences and reminder schedules stay on the current device
- No new identity model beyond anonymous device and manager JWT flows
- No reminder or settings state is sent to the backend

## Technology Stack

### Mobile app

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- Expo Secure Store
- Expo Notifications
- React Native Safe Area Context

### Backend API

- Fastify
- TypeScript
- Drizzle ORM
- PostgreSQL
- Redis
- Zod
- JSON Web Tokens

### Tooling and infrastructure

- pnpm workspaces
- Docker Compose
- Jest for mobile tests
- Vitest for backend tests
- GitHub Actions

## Repository Layout

```text
MoodMarble/
├── apps/
│   ├── backend/
│   └── mobile/
├── docs/
├── packages/
│   └── shared/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

## System Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- Docker Desktop
- Android Studio and an Android emulator if you need Android development-build verification
- Xcode only if you plan to verify iOS native behavior locally

## Environment Setup

The backend loads environment variables from either:

- `apps/backend/.env`
- the repository root `.env`

The easiest local setup is to copy the backend example file to the project root:

```powershell
Copy-Item apps/backend/.env.example .env
```

Default local values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/moodmarble
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-dev-jwt-secret-change-me
HOST=0.0.0.0
PORT=3000
```

## Installation

```bash
git clone <repository-url>
cd MoodMarble
pnpm install
docker compose up -d
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
```

The local seed creates:

- workspace: `ws_localdemo`
- join code: `ABC123`
- teams: `tm_product`, `tm_engineering`

## Running The Project

### Backend

```bash
pnpm --filter backend dev
```

Expected local URL:

```text
http://127.0.0.1:3000
```

Health check:

```text
GET /health
```

### Mobile app

Start the Expo app from the repo root with workspace filtering:

```bash
pnpm --filter moodmarble start
```

Other useful mobile commands:

```bash
pnpm --filter moodmarble android
pnpm --filter moodmarble ios
pnpm --filter moodmarble web
pnpm --filter moodmarble test
pnpm --filter moodmarble lint
```

### Supported local runtimes

- Expo Go: anonymous onboarding, mood submission, local history, manager route shell, and local settings UI
- Android development build: required for real Android local notification scheduling verification
- iOS native runtime: required for native iOS notification verification
- Web: useful for flow checks, but reminders remain local-only and web does not schedule notifications

## API Overview

### Member-facing endpoints

- `GET /health`
- `POST /workspace/join`
- `POST /mood`

### Manager-facing endpoints

- `GET /dashboard/team/:teamId/daily`
- `GET /dashboard/team/:teamId/weekly`
- `GET /dashboard/team/:teamId/tags`

Manager endpoints require a valid manager JWT in the `Authorization` header. The current repository does not yet include a dedicated manager login UI.

### Not available yet

The following spec items are not yet exposed by the current backend:

- `/admin/team`
- `/admin/workspace/:id/export`
- admin authorization endpoints or admin UI routes

## Local Usage Notes

### Joining a workspace

Use the seeded join code `ABC123` to exercise the anonymous member flow locally.

Example request:

```json
{
  "join_code": "ABC123",
  "device_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

The join response returns:

- workspace metadata
- available teams
- a signed `device_jwt` for anonymous mood submission

### Mood submission constraints

- one mood per submission
- up to two tags per submission
- optional note up to 120 characters
- `hour_of_day` must be an integer from `0` to `23`
- the same anonymous device is limited to 5 submissions per local day

### Reminder behavior

- reminder settings are stored locally on-device
- reminder schedules are stored locally on-device
- Android Expo Go can open the settings flow, but real Android notification scheduling requires a development build
- local data deletion clears device-stored session, history, reminder, and settings state only

## Windows And Android Development Notes

These notes reflect the current verified repo behavior and recent Android dev-client fixes.

- If ports `3000` or `8081` are stuck from a previous run, stop the stale process before restarting the backend or Metro
- Windows native Android builds may require a short pnpm virtual store directory such as `C:\mmvs` to avoid path-length issues
- Metro is configured to resolve symlinked packages correctly for the Windows short-store setup
- Avoid eager top-level imports of `expo-notifications` in startup route paths so Expo Go stays stable
- For physical-device testing, keep `apps/mobile/.env.local` local-only and set `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000`

## Recent Changes And Developer Impact

### Newly reflected in this README

- The manager dashboard is implemented and should no longer be treated as a planned feature
- Local-only settings and reminder flows are implemented and verified at the code and test level
- Native settings handoff from the member home flow is covered by focused regression tests
- Metro now supports symlink-aware resolution needed for the Windows short virtual-store Android setup

### Important workflow changes

- Android reminder verification now requires a development build instead of relying on Expo Go
- Admin panel and CSV export work remain future scope and should not be treated as present functionality
- The current repository boundary for the next sprint is Week 7 admin responsibilities only: workspace creation, team management, join code generation or copying, and CSV export

## Testing

Backend:

```bash
pnpm --filter backend test
```

Mobile:

```bash
pnpm --filter moodmarble test
pnpm --filter moodmarble lint
```

Recent verified coverage includes:

- anonymous join and device JWT behavior
- mood submission contracts and rate limiting
- local history timeline, calendar, and streak behavior
- manager dashboard route and chart rendering
- manager dashboard privacy-threshold enforcement
- local settings, onboarding replay, reminder state, and local data deletion

## Documentation

- `docs/architecture.md`: implementation blueprint and milestone plan
- `docs/week-3-workspace-audit.md`: Week 3 audit and gap analysis
- `docs/week-4-handoff.md`: local-history boundary and verification notes
- `docs/week-5-handoff.md`: manager dashboard boundary and verification notes
- `docs/week-6-handoff.md`: settings and reminder boundary and verification notes
- `docs/task-tracker.md`: milestone tracking through upcoming admin and export work

## Contribution Guidelines

- Follow the project specification and the verified repository state
- Keep changes privacy-safe and account-light
- Do not introduce a new identity model unless a blocking bug makes a minimal fix unavoidable
- Keep personal history, reminder state, and local settings on-device unless the spec explicitly changes
- Add or update focused tests when behavior changes
- Keep debug artifacts, local logs, screenshots, and one-off investigation files out of commits
- During the current Week 7 sprint, keep changes scoped to admin and export responsibilities and avoid touching stable Week 3-6 flows unless fixing a narrowly scoped bug

## License

Private project. All rights reserved.

## Contributor

- Maulik Gupta ([thenamakop](https://github.com/thenamakop))
