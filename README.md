# MoodMarble

> Anonymous team mood tracking, designed for privacy-first workplace wellbeing.

MoodMarble helps teams understand collective sentiment without exposing individual responses. Team members can quickly log how they feel, while managers see only aggregated trends and insights.

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

### Planned Manager Features

- Daily mood overview
- Weekly trend analysis
- Mood distribution visualization
- Common workplace sentiment tags
- Team wellbeing alerts

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
- React Native Safe Area Context

## Backend API

- Fastify
- TypeScript
- Drizzle ORM
- PostgreSQL
- Redis
- Zod
- Swagger

## Infrastructure

- Docker
- GitHub Actions
- Expo EAS
- Railway / Render

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
│   └── architecture.md
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
- pnpm
- Docker Desktop

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

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/moodmarble

REDIS_URL=redis://localhost:6379

JWT_SECRET=replace-with-secure-secret
```

---

## Run Backend

```bash
cd apps/backend

pnpm dev
```

Expected:

```text
http://localhost:3000
```

Health Check:

```text
GET /health
```

---

## Backend Postman Workflow

### Prerequisites

Before sending requests in Postman, make sure:

- Postman is installed.
- Docker Desktop is running.
- `docker compose up -d` has started PostgreSQL and Redis.
- The project root `.env` file exists and includes:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/moodmarble
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-secure-secret
```

- Backend setup has been completed:

```bash
cd apps/backend
pnpm db:migrate
pnpm db:seed
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

- `200 OK`: health check passed or workspace join succeeded
- `201 Created`: mood submission succeeded
- `400 Bad Request`: invalid join payload or invalid mood payload
- `401 Unauthorized`: missing or invalid device JWT on `POST /mood`
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

## Run Mobile App

```bash
cd apps/mobile

pnpm start
```

Open using:

- Expo Go (Android) for onboarding, join, mood submission, history, dashboard, and local settings UI
- Expo Go (iOS)
- Android Emulator
- iOS Simulator

### Reminder Runtime Notes

- Reminder settings always save locally on the current device.
- Android Expo Go can open the app and settings screen, but Android reminder scheduling requires a development build.
- Android development builds can schedule and cancel local reminder notifications.
- iOS supports local reminder scheduling in supported native runtimes.
- Web keeps reminder settings local-only and does not schedule notifications.

### Android Development Build

If you need to verify Android reminder scheduling instead of the Expo Go local-only path:

```bash
cd apps/mobile

npx expo run:android
npx expo start --dev-client
```

Use the installed development build on the emulator or device to open the project after the native client is created.

### Physical Device Setup

- Run the backend on the host machine.
- Keep the phone and computer on the same Wi-Fi network.
- Use the host LAN IP, not `localhost`, for physical devices.
- Set `apps/mobile/.env.local` to `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000`.
- Keep that env file local-only and do not commit it.
- Start Expo from `apps/mobile`.
- Restart Expo after changing `apps/mobile/.env.local`.
- Web and emulator behavior remain unchanged.

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

**Week 6 local settings and reminder foundations are implemented**

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
- Local-only reminder settings and reminder-time persistence
- Settings screen for reminder preferences, onboarding replay, and local data deletion
- Android Expo Go-safe reminder runtime boundary
- Development-build reminder scheduling and cancellation support
- Local onboarding replay without creating a new identity
- Device-local data deletion for session, history, and reminder state
- Backend and mobile verification coverage for the Week 3 flow
- Backend and mobile verification coverage for the Week 4 local history flow
- Focused Week 6 settings and reminder regression coverage
- Docker infrastructure

### Stable for Week 6

- Anonymous onboarding and join flow
- Workspace-scoped team selection
- Device JWT issuance and validation
- Secure mobile session restore and fallback to onboarding
- Privacy-safe join and submission error handling
- Local-only timeline, streak, and monthly calendar history
- Exact local timestamp display stored only on-device
- Local reminder preferences stored only on-device
- Onboarding replay request handling stored only on-device
- Local data deletion for anonymous member state
- Android emulator, web, and physical-device local development paths

### Upcoming

- Manager dashboard routes and privacy-threshold logic
- Admin-managed workspace and team setup
- Export flows and later-phase integrations

---

# Documentation

| Document             | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| docs/architecture.md | System architecture and implementation blueprint |

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
