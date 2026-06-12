# MoodMarble

> Anonymous team mood tracking, designed for privacy-first workplace wellbeing.

MoodMarble helps teams understand collective sentiment without exposing individual responses. Team members can quickly log how they feel, while managers see only aggregated trends and insights.

---

## Core Principles

### Privacy First

* No names
* No email addresses
* No personal profiles
* No GPS or location tracking
* No individual mood visibility
* No personally identifiable information stored with mood submissions

### Anonymous by Design

* Mood submissions are anonymous
* Managers only see aggregated team-level data
* Personal mood history remains on-device

### Simple and Fast

* Mood check-in in under 5 seconds
* Mobile-first experience
* Lightweight and accessible UI

---

# MVP Features

### Team Member Features

* Anonymous mood submissions
* Mood tagging
* Optional mood notes
* Personal mood history
* Mood streak tracking
* Daily check-in reminders

### Manager Features

* Daily mood overview
* Weekly trend analysis
* Mood distribution visualization
* Common workplace sentiment tags
* Team wellbeing alerts

### Admin Features

* Workspace creation
* Team management
* Join code management
* Anonymous CSV exports

---

# Technology Stack

## Mobile Application

* React Native
* Expo
* Expo Router
* TypeScript
* Zustand
* NativeWind
* React Native Reanimated
* Victory Native
* Expo Notifications
* Expo Secure Store

## Backend API

* Fastify
* TypeScript
* Drizzle ORM
* PostgreSQL
* Redis
* Zod
* Swagger

## Infrastructure

* Docker
* GitHub Actions
* Expo EAS
* Railway / Render

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

* Node.js 20+
* pnpm
* Docker Desktop

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

* PostgreSQL 16
* Redis

Verify:

```bash
docker ps
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moodmarble

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

## Run Mobile App

```bash
cd apps/mobile

pnpm start
```

Open using:

* Expo Go (Android)
* Expo Go (iOS)
* Android Emulator
* iOS Simulator

---

# Development Status

## Current Phase

**Week 1 — Setup & Architecture**

### Completed

* Repository structure
* Project planning
* Architecture documentation
* Docker infrastructure

### In Progress

* Shared schema package
* Database schema
* Initial backend setup

### Upcoming

* Workspace join flow
* Anonymous device authentication
* Mood submission API
* Marble tray UI

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

* [ ] No PII collected
* [ ] No user identification possible
* [ ] No raw notes stored server-side
* [ ] No individual manager visibility
* [ ] Aggregation thresholds respected

---

# Roadmap

### Phase 1 — MVP

* Anonymous mood submissions
* Team dashboards
* Personal mood history
* Daily prompts
* Team management
* CSV export

### Phase 2

* Mood of the Week
* Custom marble sets
* Anonymous suggestion box
* Insight generation
* Collaboration platform integrations

---

# License

Private project.

All rights reserved.

---

# Contributors
Maulik Gupta (thenamkop)

[![GitHub Profile](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/thenamakop)   
