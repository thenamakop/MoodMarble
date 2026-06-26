# MoodMarble Architecture

> **Purpose**

> This document defines the implementation blueprint for the MoodMarble MVP. It translates the project specification into a buildable system design.

>

> **Source of truth**

> The project specification is the source of truth. If anything here conflicts with it, the specification takes precedence.

---

## 1) Product overview

MoodMarble is a **free, anonymous, privacy-first team mood app**.

The MVP has three responsibilities:

1. Let a team member log a mood in a few taps.

2. Let a manager view only **aggregated** team mood trends.

3. Keep personal mood history **on-device only**.

### Non-negotiable rules

- No names.

- No email addresses.

- No user profiles.

- No device identifiers in mood submissions.

- No IP logging.

- No GPS or location.

- No raw note text stored on the backend.

- No individual mood entries exposed to managers.

---

## 2) System overview

| Layer | Choice | Why it exists |

| --- | --- | --- |

| Mobile app | React Native + Expo | One codebase for iOS and Android |

| Language | TypeScript | Safer contracts and fewer bugs |

| Navigation | Expo Router | File-based routing and simple structure |

| State | Zustand | Lightweight app state |

| Local storage | Expo SecureStore + AsyncStorage | Device-only history and settings |

| Animation | React Native Reanimated 3 | Smooth marble drop feedback |

| Charts | Victory Native | Manager analytics and trends |

| Push notifications | Expo Notifications | Daily prompts without paid services |

| Styling | NativeWind | Fast, consistent UI system |

| Backend | Fastify + TypeScript | Fast API and clean route structure |

| ORM | Drizzle ORM | Typed schema and migrations |

| Database | PostgreSQL 16 | Reliable analytics storage |

| Cache / rate limiting | Redis | Submission limits and short-lived counters |

| Validation | Zod | Shared request and response validation |

| API docs | Swagger | Generated from route schemas |

---

## 3) Architecture at a glance

```text

Team Member

  ↓

Mobile App

  ↓

POST /mood

  ↓

Fastify API

  ↓

PostgreSQL

  ↓

Aggregation Service

  ↓

Manager Dashboard

```

### Design principle

Mood data is split into two worlds:

- **On-device only:** personal history, prompt preferences, local UI state

- **Backend only:** anonymised mood submissions and aggregated summaries

That separation is the core privacy model.

---

## 4) Data flow

### Submission flow

1. A team member opens the app and taps a marble.

2. The app captures:

   - `workspace_id`

   - `team_id`

   - `mood_type`

   - optional `tags`

   - optional anonymous note

   - `hour_of_day`

3. The backend validates the request.

4. The backend stores only anonymised submission data.

5. The backend updates aggregate views used by the manager dashboard.

6. The app shows a confirmation animation.

### Dashboard flow

1. A manager opens the dashboard.

2. The app requests summary data only.

3. The backend returns aggregated counts and trends.

4. The dashboard renders charts without any individual entry.

---

## 5) Privacy rules

These are hard rules, not suggestions.

### Never collect

- name

- email

- phone number

- device IMEI

- GPS / location

- raw personal identifiers

- raw note text on the backend

### Collect only what the MVP needs

- mood type

- optional tags

- hour of day

- anonymised submission data

- hashed note value for deduplication only

### Important threshold rules

- Dashboard data appears only when there are **5+ submissions** in the selected time window.

- If a team has **fewer than 5 members**, results are blurred into ranges.

- If a specific hour has **fewer than 3 submissions**, managers cannot drill into that hour.

These rules are implemented in `apps/backend/src/services/dashboard-privacy.ts` and are constant across the daily, weekly, and tag routes. For local development and E2E, `apps/backend/src/routes/test-fixtures.ts` seeds enough team members and submissions to clear all three thresholds.

### Practical rule for developers

If a feature creates a chance to identify a person, it does not ship without explicit approval.

---

## 6) Database model

### Tables

#### `workspaces`

Top-level organisation container.

Key fields:

- `id`

- `name`

- `join_code`

- `created_at`

Purpose:

- hold one organisation

- create a unique 6-character join code

#### `teams`

Workspaces can have multiple teams.

Key fields:

- `id`

- `workspace_id`

- `name`

- `created_at`

Purpose:

- scope mood reporting to a team

#### `mood_submissions`

Anonymous mood events.

Key fields:

- `id`

- `team_id`

- `mood_type`

- `tags[]`

- `hour_of_day`

- `submission_date`

Purpose:

- store only anonymised mood data

Important:

- no `user_id`

- no raw note text

- no device identifier in this table

#### `team_members`

Anonymous membership mapping.

Key fields:

- `id`

- `team_id`

- `device_token`

- `role`

- `joined_at`

Purpose:

- track anonymous device membership

- support permissions and rate limiting

Important:

- `device_token` is a random UUID generated on install

- it is not linked to any account identity

#### `notification_schedules`

Local-only concept.

Important:

- this is **not** stored in the backend database

- it lives on the device only

---

## 7) API contract

### Authentication model

MoodMarble uses an anonymous device token plus JWTs for role-based access.

- `device_token`: anonymous device identity for rate limiting

- `Device JWT`: allows a device to submit moods

- `Manager JWT`: allows dashboard access

- `Admin JWT`: allows workspace and team management

### MVP endpoints

#### `POST /workspace/join`

Joins a workspace using a 6-character join code.

Returns:

- team list

- signed device JWT

#### `POST /mood`

Submits one anonymous mood entry.

Rules:

- max 5 submissions per device per day

- accepts optional tags

- accepts optional note

- stores hour-of-day only

#### `GET /dashboard/team/:teamId/daily`

Returns today’s hourly mood aggregations for a team.

#### `GET /dashboard/team/:teamId/weekly`

Returns the 7-day mood trend for a team.

#### `GET /dashboard/team/:teamId/tags`

Returns top tags for the current week.

#### `GET /health`

Simple health check for deployment and monitoring.

#### `POST /admin/team`

Creates a new team inside a workspace.

#### `GET /admin/workspace/:id/export`

Exports anonymised mood data as CSV for a date range.

---

## 8) Key payload example

### Mood submission

```json
{
  "team_id": "tm_abc123",

  "mood_type": "stressed",

  "tags": ["#workload", "#deadlines"],

  "hour_of_day": 14
}
```

### Success response

```json
{
  "status": "received",

  "marble_id": "mr_9x2yz"
}
```

---

## 9) Mobile app screens

### Required MVP screens

- Onboarding

- Home / Marble Tray

- Submission Confirmation

- My History

- Daily Prompts Settings

- Manager Dashboard

- Admin Panel

- Settings

### Screen intent

#### Onboarding

Explain privacy, join by code, and move the user into the app quickly.

#### Home / Marble Tray

The primary action screen. This is where mood submissions happen.

#### Submission Confirmation

Short, joyful feedback after a successful submission.

#### My History

Local-only timeline, streaks, and mood calendar.

#### Daily Prompts Settings

User-configured reminder times and opt-out.

#### Manager Dashboard

Aggregated charts, no individual records.

#### Admin Panel

Workspace and team setup, join code management, export.

#### Settings

Local preferences, onboarding replay, and local data deletion.

---

## 10) Visual system

### Marble moods

| Mood | Colour | Meaning |

| --- | --- | --- |

| Energised | `#22C55E` | High energy |

| Happy | `#38BDF8` | Content, positive |

| Calm | `#A78BFA` | Relaxed, balanced |

| Focused | `#FBBF24` | In flow, productive |

| Neutral | `#9CA3AF` | Neither good nor bad |

| Tired | `#FB923C` | Low energy |

| Stressed | `#F87171` | Pressure, anxiety |

| Sad | `#60A5FA` | Feeling down |

| Unheard | `#4B5563` | Concern ignored |

### UI principles

- Frictionless: log mood in under 5 seconds

- Expressive: colourful and tactile

- Private-feeling: no names, no visible login

- Joyful: subtle motion and haptics

- Accessible: strong contrast and clear labels

---

## 11) Performance and reliability targets

| Area | Target |

| --- | --- |

| App cold start | under 2 seconds |

| Submission round-trip | under 500ms on 4G |

| Dashboard load | under 1.5 seconds |

| Backend scale target | up to 10,000 submissions/day |

| Uptime target | 99.5% on free-tier hosting |

| Offline behavior | queue locally, sync when online |

### Security targets

- HTTPS only

- JWT expiry: 30 days

- rate limit: 5 submissions per device per day

- no sensitive data in error messages

---

## 12) Repository structure

```text

moodmarble/

├── apps/

│   ├── mobile/

│   │   ├── app/

│   │   ├── components/

│   │   ├── store/

│   │   ├── utils/

│   │   └── types/

│   └── backend/

│       ├── src/

│       │   ├── routes/

│       │   ├── services/

│       │   ├── db/

│       │   └── middleware/

│       └── tests/

├── packages/

│   └── shared/

├── .github/

│   └── workflows/

├── docker-compose.yml

└── README.md

```

---

## 13) Development milestones

### Week 1 — Setup & architecture

- Expo project init

- Fastify backend scaffold

- PostgreSQL schema created

- README started

### Week 2 — Core submission flow

- marble tray UI

- mood submission API

- rate limiting

- confirmation animation

### Week 3 — Onboarding & auth

- join code flow

- device JWT issuance

- onboarding screens

- workspace/team setup

### Week 4 — Personal history

- local mood history

- timeline view

- mood calendar

- streak counter

### Week 5 — Dashboard

- aggregated API endpoints

- Victory Native charts

- daily and weekly views

### Week 6 — Notifications & settings

- push notifications

- configurable prompt times

- settings screen

### Week 7 — Admin panel & export

- admin UI

- team management

- CSV export

- join code generation

### Week 8 — Polish, testing & deployment

- Jest unit tests

- Detox E2E tests

- performance audit

- Expo EAS build

- Render / Railway deploy

---

## 14) Testing strategy

### Backend

- Jest + Supertest

- minimum 60% coverage

- focus on routes, anonymity, rate limiting, aggregation

### Frontend

- Jest + React Native Testing Library

- minimum 40% coverage

- focus on marble selection, validation, local storage

### E2E

- Detox

- focus on key journeys only:

  - onboarding → submit mood → view history

  - manager login → view dashboard

### Manual

- physical device + simulator

- verify all screens

- verify animation quality

- verify accessibility and consistency

### Privacy audit

- inspect logs

- inspect network requests

- confirm no PII is exposed anywhere

---

## 15) Definition of done

The MVP is complete only when all of the following are true:

- all MVP features work on iOS and Android

- backend is deployed and reachable via HTTPS

- anonymity rules are implemented and verified

- backend unit coverage is at least 60%

- Expo EAS builds succeed for both platforms

- README includes setup, environment variables, and deployment steps

---

## 16) Build rule

Development should follow this order:

1. read the specification

2. read this architecture document

3. implement shared schemas

4. scaffold backend and database

5. scaffold mobile app

6. wire submission flow

7. add privacy guards

8. add dashboard and admin features

9. test everything

10. deploy only after the definition of done is met

> **Final reminder**

> If a decision affects privacy, anonymity, or scope, stop and confirm it rather than assuming.
