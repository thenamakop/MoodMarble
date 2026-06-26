# MoodMarble

> Anonymous team mood tracking, designed for privacy-first workplace wellbeing.

MoodMarble helps teams understand collective sentiment without exposing individual responses. Team members can quickly log how they feel, keep a private history on their own device, and receive local reminder prompts, while managers see only aggregated trends and insights.

---

## Core Principles

### Privacy First

- No names
- No email addresses
- No personal profiles
- No GPS or location tracking
- No individual mood visibility
- No personally identifiable information stored with mood submissions

### Anonymous by Design

- Mood submissions are anonymous
- Managers only see aggregated team-level data
- Personal mood history remains on-device
- Reminder settings and reminder schedules remain on-device

### Simple and Fast

- Mood check-in in under 5 seconds
- Mobile-first experience
- Lightweight and accessible UI

---

# Current Product Scope

### Team Member Features

- Anonymous mood submissions
- Mood tagging
- Optional mood notes
- Personal mood history on the current device
- Mood streak tracking on the current device
- Personal mood calendar on the current device
- Month-to-month calendar navigation on the current device
- Exact local timestamp display in personal history on the current device
- Local reminder settings with `1-3` reminder times stored on-device
- On-device onboarding replay from settings
- Device-local data deletion for session, history, and reminder-related state

### Manager Features

- Daily mood overview
- Weekly trend analysis
- Mood distribution visualization
- Common workplace sentiment tags
- Manager dashboard route with aggregate chart rendering
- Privacy-threshold enforcement for team analytics
- Manager JWT-protected dashboard endpoints

### Planned Admin Features

- Workspace creation
- Team management
- Join code management
- Anonymous CSV exports

---

# Technology Stack

## Mobile Application

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- Expo Secure Store
- Expo Notifications
- React Native Safe Area Context

## Backend API

- Fastify
- TypeScript
- Drizzle ORM
- PostgreSQL
- Redis
- Zod
- JSON Web Tokens

## Infrastructure

- Docker (local dev — `docker-compose.yml` provides PostgreSQL 16 + Redis)
- GitHub Actions (planned CI)
- Expo EAS (planned — no `eas.json` or EAS project ID configured yet)
- Railway / Render (planned backend hosting — no deploy config yet)

---

# Repository Structure

```text
moodmarble/
├── apps/
│   ├── mobile/
│   └── backend/
│
├── packages/
│   └── shared/
│
├── docs/
│   ├── SECURITY.md
│   ├── architecture.md
│   ├── android-e2e-stability-report.md
│   ├── week-4-handoff.md
│   ├── week-5-handoff.md
│   ├── week-6-handoff.md
│   ├── week-7-*.md
│   └── week-8-handoff.md
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── README.md
└── package.json
```

---

# Getting Started

## Prerequisites

Install:

- Node.js 20+
- pnpm 10+
- Docker Desktop
- Android Studio if you need Android development-build verification

---

## Clone Repository

```bash
git clone <repository-url>
cd moodmarble
```

---

## Install Dependencies

```bash
pnpm install
```

---

## Start Infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL 16
- Redis

Verify:

```bash
docker ps
```

---

## Environment Variables

### Backend

The backend loads environment variables from either `apps/backend/.env` or the repository root `.env`.

| Variable                 | Required  | Description                                                                                                             |
| ------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes       | PostgreSQL connection string                                                                                            |
| `REDIS_URL`              | Yes       | Redis connection string                                                                                                 |
| `JWT_SECRET`             | Yes       | Shared secret for signing all three JWT types (device, manager, admin). Min 32 chars, must not look like a JWT.         |
| `HOST`                   | No        | Server bind address (default: `0.0.0.0`)                                                                                |
| `PORT`                   | No        | Server port (default: `3000`)                                                                                           |
| `ADMIN_EMAIL`            | Seed only | Admin account email — used by `seed:admin` script, not read at runtime                                                  |
| `ADMIN_PASSWORD`         | Seed only | Admin account password — used once by `seed:admin` (min 12 chars). **Use a strong value in any non-local environment.** |
| `ADMIN_BOOTSTRAP_SECRET` | No        | Optional bootstrap secret for future automated provisioning                                                             |

Copy the example file and **change all placeholder values** before use:

```bash
# macOS / Linux
cp apps/backend/.env.example .env

# Windows PowerShell
Copy-Item apps/backend/.env.example .env
```

The example uses `local-dev-jwt-secret-change-me` and a weak admin password — these values are **for local development only**. Replace them before deploying or sharing.

### Mobile

Create `apps/mobile/.env.local` (git-ignored) when connecting to a physical device or custom backend:

```env
# URL of the backend API — leave empty to use the platform default
# (127.0.0.1:3000 on web/iOS sim, 10.0.2.2:3000 on Android emulator)
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000
```

Restart Expo after changing this file. Do not commit it.

---

## Backend Setup

Run the database setup before using the API locally:

```bash
cd apps/backend
pnpm db:migrate
pnpm db:seed
pnpm seed:admin
pnpm seed:dashboard
pnpm dev
```

`pnpm seed:dashboard` populates the demo team with enough anonymous submissions and team members to clear the manager-dashboard privacy thresholds, so charts render immediately instead of staying hidden.

Expected:

```text
http://127.0.0.1:3000
```

Health Check:

```text
GET /health
```

The local seed creates:

- workspace: `ws_localdemo`
- join code: `ABC123`
- teams: `tm_product`, `tm_engineering`
- admin account: email and password taken from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (defaults in `.env.example` are for local dev only — change before any non-local deployment)
- manager dashboard fixtures: 6+ team members and submissions across the current ISO week and the E2E manager window (via `pnpm seed:dashboard`)

### Administrative Setup & Authentication

The administrative surface is fully protected by a dedicated login flow. There is NO public sign-up or "forgot password" mechanism for administrators, as the system is designed to be closed to public registration.

To create an administrator, you must use the backend seed script. It reads the following environment variables from `.env`:

- `ADMIN_EMAIL` — the admin account email address
- `ADMIN_PASSWORD` — the admin account password (minimum 12 characters; **use a strong value outside local dev**)
- `ADMIN_BOOTSTRAP_SECRET` — optional; see `.env.example`

To provision the admin account:

```bash
cd apps/backend
pnpm seed:admin
```

If you ever lose access to your admin account, you can safely re-run the seed script. It is idempotent; if the email exists, it aborts without data loss. If you need to forcefully reset a password, you will need to directly manipulate the `admin_credentials` table via database administration tools or create a secondary admin account using the script with a new email.

The administrative auth flow is isolated:

- Member and manager access (via `device_jwt` and `manager_jwt`) cannot fulfill `admin_jwt` route guards.
- All administrative routes (`/admin/*`) strictly verify the `admin_jwt` payload.
- Manager and member roles cannot be elevated to administrative privileges through the application UI.

### Admin Login

Administrators authenticate via email and password through the mobile app.
There is no public sign-up flow. The admin account is created once using
the `seed:admin` script. Admin authentication is credential-only — no admin
join code exists by design (see `docs/SECURITY.md`).

**Creating the admin account (run once):**

```bash
cd apps/backend
# Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) in .env
pnpm seed:admin
```

The admin login screen is accessed via the small "Admin access" link at the
bottom of the onboarding join-code step in the app.

### Manager Join Codes _(Post-Scope Addition)_

The original project specification provides no mobile-safe authentication path
for managers on Android. Manager join codes address this gap.

An admin generates a 6-character code per team from the Admin Panel →
Manager codes section. Codes are valid for 7 days and can only be redeemed
once. The manager taps "Have a manager code?" on the onboarding screen, enters
the code, and the app navigates directly to the manager dashboard.

This feature was introduced after the Week 8 internship deliverables were
finalised. It is not part of `MoodMarble_Project_Specification.docx`. All
tests are in `apps/mobile/e2e/manager-join-code-journey.e2e.cjs`.

**Implementation pointers:**

- Backend endpoint: `POST /auth/redeem-manager-code` in `src/routes/auth.ts`
- Admin generate/list/revoke: `src/routes/admin.ts`
- Mobile entry screen: `src/app/join-manager.tsx`
- Security properties: `docs/SECURITY.md`

---

## Backend Postman Workflow

### Prerequisites

Before sending requests in Postman, make sure:

- Postman is installed.
- Docker Desktop is running.
- `docker compose up -d` has started PostgreSQL and Redis.
- The project root `.env` file exists with valid values (see `apps/backend/.env.example` and the Environment Variables section above).

- Backend setup has been completed:

```bash
cd apps/backend
pnpm db:migrate
pnpm db:seed
pnpm seed:admin
pnpm dev
```

- The local API base URL is:

```text
http://127.0.0.1:3000
```

- Seeded local join code:

```text
ABC123
```

### Request 1: Health Check

Use this first to confirm the backend is running.

- Method: `GET`
- URL: `http://127.0.0.1:3000/health`
- Headers: none
- Body: none
- Expected status: `200 OK`
- Expected response:

```json
{
  "status": "ok"
}
```

### Request 2: Join Workspace

Use this to get a device JWT for the anonymous submission flow.

- Method: `POST`
- URL: `http://127.0.0.1:3000/workspace/join`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "join_code": "ABC123",
  "device_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

- Expected status: `200 OK`
- Expected response shape:

```json
{
  "workspace": {
    "id": "ws_localdemo",
    "name": "MoodMarble Local Workspace"
  },
  "teams": [
    {
      "id": "tm_product",
      "name": "Product"
    },
    {
      "id": "tm_engineering",
      "name": "Engineering"
    }
  ],
  "device_jwt": "<signed-jwt>"
}
```

Save the returned `device_jwt`. You will use it in the `Authorization` header for `POST /mood`.

### Request 3: Submit Mood

Use the JWT from the join response and submit only anonymous mood data.

- Method: `POST`
- URL: `http://127.0.0.1:3000/mood`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <device_jwt>`
- Body parameters:
  - `workspace_id`: workspace ID returned from join
  - `team_id`: one of the team IDs returned from join
  - `mood_type`: one of the 9 allowed moods
  - `tags`: up to 2 allowed tags
  - `note`: optional, max 120 characters
  - `hour_of_day`: integer hour only, `0` through `23`
- Example body:

```json
{
  "workspace_id": "ws_localdemo",
  "team_id": "tm_product",
  "mood_type": "happy",
  "tags": ["#team", "#recognition"],
  "note": "Feeling good after planning.",
  "hour_of_day": 10
}
```

- Expected status: `201 Created`
- Expected response:

```json
{
  "status": "received",
  "marble_id": "mr_1234567890"
}
```

### Request 4: Manager Dashboard Endpoints

The current verified repo state also includes manager-facing aggregate dashboard routes:

- `GET /dashboard/team/:teamId/daily`
- `GET /dashboard/team/:teamId/weekly`
- `GET /dashboard/team/:teamId/tags`

These routes require a valid manager JWT in the `Authorization` header and enforce aggregate-only privacy rules.

### Allowed Submission Values

Use only these spec-aligned values in Postman.

- `mood_type`:
  - `energised`
  - `happy`
  - `calm`
  - `focused`
  - `neutral`
  - `tired`
  - `stressed`
  - `sad`
  - `unheard`
- `tags`:
  - `#meetings`
  - `#workload`
  - `#management`
  - `#team`
  - `#deadlines`
  - `#recognition`

### Common Response Codes

- `200 OK`: health check passed, workspace join succeeded, or dashboard data loaded
- `201 Created`: mood submission succeeded
- `400 Bad Request`: invalid join payload, invalid mood payload, or invalid dashboard query
- `401 Unauthorized`: missing or invalid JWT for protected endpoints
- `403 Forbidden`: valid manager token does not match the requested team or workspace scope
- `404 Not Found`: join code does not exist
- `429 Too Many Requests`: more than 5 mood submissions sent for the same device on the same day
- `500 Internal Server Error`: backend configuration issue, such as missing `JWT_SECRET`

### Troubleshooting

- `POST /workspace/join` returns `404`
  - Make sure you are using the seeded join code `ABC123`.
  - Re-run `pnpm db:seed` from `apps/backend`.
- `POST /mood` returns `401`
  - Make sure `Authorization` is exactly `Bearer <device_jwt>`.
  - Get a fresh token by calling `POST /workspace/join` again.
- Dashboard routes return `401` or `403`
  - Confirm you are using a valid manager JWT, not a device JWT.
  - Confirm the token team matches the requested `teamId`.
- `POST /mood` returns `400`
  - Check `hour_of_day` is an integer from `0` to `23`.
  - Check `mood_type` matches one of the allowed values exactly.
  - Check `tags` contains at most 2 allowed values.
  - Check `note` is 120 characters or fewer.
- `POST /mood` returns `429`
  - The anonymous device has reached the daily limit of 5 submissions.
  - Join again to get a different test JWT, or wait until the next day boundary for the same device token.
- Requests fail to connect
  - Confirm the backend is running on `http://127.0.0.1:3000`.
  - Confirm Docker containers are healthy with `docker compose ps`.
  - Confirm the root `.env` still points to Docker Postgres on port `5433`.

---

## Manager Dashboard (Browser / Direct Link)

You can open the manager dashboard directly in a web browser for quick local verification without launching the mobile app.

### 1. Generate a manager JWT

```bash
cd apps/backend
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({workspace_id:'ws_localdemo',team_id:'tm_product',role:'manager'}, process.env.JWT_SECRET || 'local-dev-jwt-secret-change-me', {expiresIn:'30d'}));"
```

### 2. Open the dashboard

Replace `<JWT>` with the token printed above and visit:

```text
http://localhost:8081/manager?manager_jwt=<JWT>&manager_teams=tm_product:Product&team_id=tm_product&team_name=Product&date=2026-06-22&start_date=2026-06-16
```

The query parameters mirror the route params used by the mobile app's manager dashboard screen. The `start_date` and `date` values control the weekly window and the daily heatmap respectively.

### Manual demo server

`apps/backend/scripts/manual-dashboard-server.ts` starts a self-contained demo backend on port `3001` and prints a ready-made dashboard link:

```bash
cd apps/backend
npx tsx scripts/manual-dashboard-server.ts
```

Note that this demo server uses an **in-memory data source** and a hardcoded JWT secret, so it is only useful for UI layout checks. Use the real backend link above to verify the seeded data.

---

## Run Mobile App

```bash
cd apps/mobile

pnpm start
```

Open using:

- Expo Go (Android) for onboarding, join, mood submission, history, manager route shell, and local settings UI
- Expo Go (iOS)
- Android Emulator
- iOS Simulator

### Reminder Runtime Notes

- Reminder settings always save locally on the current device.
- Reminder schedules always save locally on the current device.
- Android Expo Go can open the app and settings screen, but Android reminder scheduling requires a development build.
- Android development builds can schedule and cancel local reminder notifications.
- iOS supports local reminder scheduling in supported native runtimes.
- Web keeps reminder settings local-only and does not schedule notifications.

### Android Development Build

If you need to verify Android reminder scheduling instead of the Expo Go local-only path:

```bash
cd apps/mobile

npx expo run:android
npx expo start --dev-client --clear --host localhost
```

Use the installed development build on the emulator or device to open the project after the native client is created.

### Basic Detox E2E

Week 8 includes a complete Detox layer covering the most critical Android user journeys:

- **Member Journey**: anonymous onboarding -> join code entry -> team selection -> mood submission -> history -> settings
- **Manager Journey**: manager join-code entry -> scoped dashboard view
- **Admin Journey**: email/password login -> scoped admin panel

The E2E test suite ensures these key experiences do not regress and relies on the Android emulator with the Expo development build flow.

#### Prerequisites and Setup

- Android SDK installed at `D:\Android`
- `ANDROID_SDK_ROOT=D:\Android` and `ANDROID_HOME=D:\Android` environment variables set
- `D:\Android\platform-tools` on your `PATH` so `adb` is accessible globally
- An Android AVD named `Pixel_8` (or override by setting `DETOX_AVD_NAME`)
- The backend running locally on `http://127.0.0.1:3000`

Start the Pixel 8 emulator:

```powershell
& "D:\Android\emulator\emulator.exe" -avd Pixel_8
```

Confirm ADB connectivity:

```powershell
adb devices
```

The expected result is one connected emulator entry such as `emulator-5554 device`. If you do not see the device, restart ADB (`adb kill-server` and `adb start-server`) or start the emulator from Android Studio.

Optional repo preflight to verify your environment:

```bash
cd apps/mobile
pnpm e2e:android:preflight
```

#### Unit & Integration Tests

The repository includes standard Jest tests for backend logic and React Native component rendering. You can run these without the emulator:

```bash
pnpm test:backend
pnpm test:mobile
```

#### Deterministic Data & Backend Seed

The tests depend on a seeded test workspace and use an idempotent setup function. At the start of each E2E test file, a helper called `resetBackendTestState()` sends a request to the `POST /__test/reset` backend route. This safely truncates the database and explicitly seeds the `ws_localdemo` workspace, the `tm_product` team, the test admin account, and dashboard fixtures for `tm_product`.

The dashboard fixtures are designed to clear every privacy threshold used by the manager dashboard:

- `minimum_submissions`: 5 submissions in the selected window
- `minimum_members_for_precise_values`: 5 team members
- `minimum_hourly_submissions`: 3 submissions in an hour bucket

If the backend is not running, the manager and admin journeys will fail to authenticate. Ensure the backend is running before launching tests:

```bash
cd apps/backend
pnpm dev
```

#### Running the E2E Tests

First, start Metro for the Android development build from the mobile app directory:

```bash
cd apps/mobile
pnpm e2e:android:metro
```

Note: the E2E preflight now validates Metro and the backend before Detox runs. If Metro or the backend are not reachable, the preflight will fail fast with a clear message — start Metro and the backend before running the tests.

In a second terminal, build the app and Detox test APKs (this only needs to run if native code changes):

```bash
cd apps/mobile
pnpm e2e:android:build
```

Finally, execute the tests. You can run them headed (visible emulator screen) or headless (no emulator window shown):

```bash
pnpm e2e:android:test
# OR
pnpm e2e:android:test:headless
```

#### Notes

- The debug app automatically rewrites `localhost` network requests to `10.0.2.2`, so Android emulator traffic successfully targets `http://10.0.2.2:3000`.
- The manager journey uses the manager join-code flow (`MGR001` seeded by `/__test/reset`). The admin journey uses email/password login with the credentials from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (default example values are intentionally weak — change them for any non-local environment).
- The manager dashboard E2E window (`start_date=2026-06-16`, `date=2026-06-22`) is now seeded with visible data, so the dashboard renders charts instead of hidden placeholders.
- The member journey E2E has been hardened against onboarding skip issues, keyboard overlay, history navigation, settings scroll position, and the submission confirmation overlay.
- These basic Detox tests do not cover iOS. Adding iOS E2E would require an iOS native project/runtime path and is intentionally out of scope for this basic MVP.

### Android And Windows Notes

- Clear any stale listeners on ports `3000` and `8081` before restarting local development servers.
- Use the Pixel 8 Android 14 / API 34 / x86_64 emulator as the default local Android E2E target. Detox has been configured to boot this emulator with `-no-audio -no-boot-anim -no-snapshot-load` to prevent random crashes.
- If the emulator freezes, shows up as `offline` in ADB, or causes `pm install` failures (e.g. exit code 224), it may have a corrupted state. Run `adb kill-server` and `adb start-server`, or cold boot it manually using `& "D:\Android\emulator\emulator.exe" -avd Pixel_8 -wipe-data`.
- If `pnpm e2e:android:preflight` reports no running emulator, start `Pixel_8` in Android Studio Device Manager or with `& "D:\Android\emulator\emulator.exe" -avd Pixel_8`.
- If Android Studio is missing SDK components, install Android Emulator, Platform-Tools, Android SDK Platform 34, and the matching system image for the Pixel 8 API 34 AVD under the `D:\Android` SDK root.
- The Android dev-client/Detox flow assumes Android Studio and the Expo Android toolchain are installed locally.
- Metro is configured to resolve workspace packages correctly on Windows.
- Avoid eager top-level imports of `expo-notifications` in startup route paths so Expo Go remains stable outside the Detox/dev-client path.

### Physical Device Setup

- Run the backend on the host machine.
- Keep the phone and computer on the same Wi-Fi network.
- Use the host LAN IP, not `localhost`, for physical devices.
- Set `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000` in `apps/mobile/.env.local` (git-ignored, do not commit).
- Start Expo from `apps/mobile` and restart after changing the file.
- Web and emulator behavior remain unchanged (they use their own platform defaults).

---

## Local-Only QoL Addendum

- The personal mood calendar now supports previous and next month navigation using already-saved local device history only.
- The personal mood timeline now shows the exact local upload time for each saved marble as a secondary UI detail.
- These quality-of-life features remain device-local only.
- They do not add backend fields, backend API calls, manager visibility, or dashboard exposure.
- They do not change the anonymous join model, device session model, rate limiting, or `submission_date` local-day semantics.

---

# Development Status

## Current Phase

**Week 8 — Admin authentication, manager join-code flow, E2E hardening, and privacy audit complete**

### Completed

- Repository structure
- Shared schema package
- Anonymous mood submission API
- Workspace join foundation and device JWT issuance
- Device-generated anonymous token flow
- Mobile onboarding slides
- Join-code entry and team selection flow
- Secure anonymous session persistence and recovery
- Route protection for the anonymous member flow
- Week 3 privacy and specification compliance audit
- Per-device daily rate limiting
- Marble tray submission UI
- Confirmation flow
- Local-device-day submission semantics
- Local-only history storage
- Local-only history timeline screen
- Local-only streak tracking
- Local-only mood calendar screen
- Local-only month navigation for the mood calendar
- Exact local timestamp display in personal history
- Manager dashboard routes for daily, weekly, and tag analytics
- Manager dashboard chart rendering and route protection
- Privacy-threshold enforcement for aggregate manager analytics
- Local-only reminder settings and reminder-time persistence
- Settings screen for reminder preferences, onboarding replay, and local data deletion
- Android Expo Go-safe reminder runtime boundary
- Native settings handoff that preserves the active anonymous session
- Development-build reminder scheduling and cancellation support
- Local onboarding replay without creating a new identity
- Device-local data deletion for session, history, and reminder state
- Backend and mobile verification coverage for the Week 3 flow
- Backend and mobile verification coverage for the Week 4 local history flow
- Backend and mobile verification coverage for the Week 5 dashboard flow
- Focused Week 6 settings and reminder regression coverage
- Docker infrastructure
- Admin JWT authorization and route protection
- Administrative login and session restoration on mobile
- Admin panel (workspace, team, join-code management, CSV export)
- Manager join-code authentication flow
- Detox E2E suite (member, manager, admin journeys)
- Privacy and anonymity audit (note_hash removed from CSV export, URL-param JWT path documented)

### Stable (Week 8)

- All Week 3–6 features (anonymous onboarding, local history, dashboard, reminders, settings)
- Admin email/password auth — no admin join code by design
- Manager join-code flow (`POST /auth/redeem-manager-code`)
- Anonymous CSV export — no PII, no raw notes, no `note_hash`
- E2E journeys: member, manager join-code, admin login/logout

### Upcoming

- EAS build configuration and CI/CD pipeline
- Rate limiting on `POST /auth/redeem-manager-code` (see `docs/SECURITY.md`)
- Multiple administrator support
- Admin "Forgot Password" / password reset flow

---

# Documentation

| Document                               | Purpose                                                           |
| -------------------------------------- | ----------------------------------------------------------------- |
| `docs/SECURITY.md`                     | Authentication model, privacy boundaries, and security properties |
| `docs/architecture.md`                 | System architecture and implementation blueprint                  |
| `docs/android-e2e-stability-report.md` | Detox E2E suite status and known limitations                      |
| `docs/week-3-workspace-audit.md`       | Week 3 audit and scope alignment notes                            |
| `docs/week-4-handoff.md`               | Week 4 local-history boundary and verification notes              |
| `docs/week-5-handoff.md`               | Week 5 manager dashboard boundary and verification                |
| `docs/week-6-handoff.md`               | Week 6 settings and reminder boundary and verification            |
| `docs/week-7-admin-api-contract.md`    | Week 7 admin API contract                                         |
| `docs/week-7-admin-data-contract.md`   | Week 7 admin data and export contract                             |
| `docs/week-8-handoff.md`               | Week 8 admin auth and E2E hardening handoff                       |
| `docs/task-tracker.md`                 | Milestone tracking through Week 7 and later work                  |

---

# Development Guidelines

### Before Building Features

1. Define shared types and schemas.
2. Update architecture documentation when needed.
3. Create database schema before route implementation.
4. Build backend contracts before frontend integration.
5. Verify privacy requirements before merging.

### Privacy Checklist

Every feature must satisfy:

- [ ] No PII collected
- [ ] No user identification possible
- [ ] No raw notes stored server-side
- [ ] No individual manager visibility
- [ ] Aggregation thresholds respected

### Contribution Notes

- Keep changes aligned with the specification and the verified repo state.
- Keep personal history, reminder state, and local settings on-device unless the specification explicitly changes.
- Keep debug artifacts, screenshots, local logs, and one-off investigation files out of commits.

---

# Roadmap

### Phase 1 — MVP

- Anonymous mood submissions
- Team dashboards
- Personal mood history
- Daily prompts
- Team management
- CSV export

### Phase 2

- Mood of the Week
- Custom marble sets
- Anonymous suggestion box
- Insight generation
- Collaboration platform integrations

---

# License

Private project.

All rights reserved.

---

# Contributors

Maulik Gupta (thenamkop)

[![GitHub Profile](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/thenamakop)
