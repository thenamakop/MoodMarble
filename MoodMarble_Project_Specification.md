## 🪨 

## **MoodMarble** 

_Team Mood Sharing Mobile App_ 

## **Project Specification Document** 

Prepared for: Intern Developer Version: 1.0  |  June 2026 _Classification: Internal_ 

_"Every marble tells a story. Every team deserves to be heard."_ 

## **1. Executive Summary** 

MoodMarble is a free, anonymous mobile application that empowers team members to express their emotional state throughout the workday — without fear of judgment or identification. Using a simple, visual marble metaphor, employees can log how they feel at any point: from an energized morning start to a frustrated afternoon when concerns go unheard. 

This document serves as the complete technical and product specification for the intern developer tasked with building MoodMarble. It covers the product vision, user stories, technology stack, feature specifications, database design, API contracts, and delivery milestones. 

## **Core Philosophy** 

Anonymity is non-negotiable. No mood submission should ever be traceable back to an individual. The app collects zero personally identifiable information (PII) in mood data. Team managers see only aggregated trends — never individual responses. 

## **2. Problem Statement** 

Modern workplaces often miss the emotional pulse of their teams. Employees frequently: 

- Start the day motivated but face frustrations that go unvoiced 

- Feel their concerns are not heard by management 

- Fear retaliation or social awkwardness from being honest in retrospectives or 1:1s 

- Have no lightweight, real-time channel to signal distress or disengagement 

The result is silent disengagement, attrition surprises, and a culture where people pretend to be fine. MoodMarble solves this by giving every team member a safe, anonymous, frictionless voice — represented as a marble that rolls through the day. 

## **3. Target Users & Use Cases** 

## **3.1 User Roles** 

|**Role**|**Description**|**App Access**|
|---|---|---|
|Team Member|Regular employee; submits<br>mood entries anonymously<br>throughout the day|Mood submission, personal<br>history (no names), daily<br>prompts|



MoodMarble — Project Specification  |  Page _2_ of _16_ |  Confidential — Internal Use Only 

|Team Manager / Lead|Views aggregated team mood<br>dashboard; cannot see<br>individual entries|Analytics dashboard, trend<br>reports, mood alerts|
|---|---|---|
|Admin|Configures workspaces, teams,<br>and app settings; manages<br>user onboarding|Full admin panel, user<br>management, export reports|



## **3.2 Sample Use Cases** 

- **"I started the day happy but after that all-hands meeting I felt anxious — I want to log that."** 

   - Team member taps the app, selects an anxious marble, optionally adds a tag (e.g., #meetings) and submits anonymously. 

- **"My manager wants to know if the team is burning out this sprint."** 

   - Manager opens the dashboard and sees a heatmap of mood trends across the week, with a dip mid-sprint. 

- **"I feel like no one listens to my ideas in standups."** 

   - Employee selects the 'Unheard' mood marble and tags it #standup. No name is attached. 

- **"I want to track my own mood journey over time."** 

   - Employee views their personal marble history — a private, anonymous timeline only they can see. 

## **4. Feature Specifications** 

## **4.1 Core Features (MVP — Must Build)** 

## **4.1.1 Mood Marble Submission** 

The primary interaction. A team member taps a marble to log their current mood. 

|**Feature**|**Details**|
|---|---|
|Mood Scale|9 pre-defined marble moods: Energised<br>,<br>🟢<br>Happy<br>, Calm<br>, Focused**,**Neutral ⚪<br>Tired<br>🟣<br>🟡<br>⚪<br>, Stressed ⚪, Sad ⚪, Unheard ⚪<br>🟠|
|Submission Frequency|Up to 5 mood submissions per day per device<br>(prevents spam; no login required)|
|Optional Tags|Predefined tags: #meetings, #workload,<br>#management, #team, #deadlines, #recognition.<br>Up to 2 tags per submission.|
|Optional Note|Free-text field, max 120 characters. Stored<br>anonymously with no device identifiers.|
|Timestamp|Logged with hour-of-day (not exact time) to|



MoodMarble — Project Specification  |  Page _3_ of _16_ |  Confidential — Internal Use Only 

||prevent timing-based identification|
|---|---|
|Confirmation|Animated marble drop confirmation screen after<br>each submission|



## **4.1.2 Daily Mood Prompts** 

Push notifications sent at configurable times (e.g., 9:30 AM, 1:00 PM, 5:00 PM) reminding team members to check in. 

- " 

- Prompts are friendly and non-intrusive: "How's your marble rolling today? 🪨 

- Users can configure their own notification schedule or opt out 

- Notifications do not require account login — they use device tokens only 

## **4.1.3 Personal Mood History** 

Each user can see their own marble history — visible only to them on their device. 

- Timeline view: scrollable list of past submissions grouped by day 

- Mood streak tracker: consecutive days the user has checked in 

- Mood calendar: month view with marble colour per day (dominant mood) 

- All personal data is stored locally on-device — never synced to server with any identifier 

## **4.1.4 Team Mood Dashboard (Manager View)** 

Managers access an aggregated dashboard with no individual-level data. 

|**Widget**|**Description**|
|---|---|
|Daily Mood Heatmap|Grid of hour vs mood showing submission<br>density for the day|
|Weekly Trend Line|Line chart of average team mood score (1–9<br>scale) over 7 days|
|Mood Distribution Ring|Donut chart showing breakdown of all 9 marble<br>types this week|
|Tag Frequency Chart|Bar chart of which tags appeared most this week<br>(e.g., #workload trending)|
|Mood Alert Banner|If average mood drops below threshold<br>(configurable) for 3+ consecutive hours, manager<br>sees a gentle alert|
|Submission Volume|Total count of submissions per day — signals<br>engagement, not sentiment|



## **4.1.5 Workspace & Team Setup** 

- Admin creates a workspace (organisation) with a unique join code 

- Team members join using the join code — no email required 

MoodMarble — Project Specification  |  Page _4_ of _16_ |  Confidential — Internal Use Only 

- Admin can create multiple teams within a workspace 

- Manager is assigned to a team; sees only their team's aggregated data 

## **4.2 Enhanced Features (Phase 2 — Nice to Have)** 

- Mood of the Week summary card — shareable anonymised image for team retros 

- Custom marble types — admin can define workspace-specific moods 

- Anonymous suggestion box — text-only, no mood marble required 

- Mood correlation insights — e.g., '#meetings' correlates with ⚪ stress 73% of time 

- Slack / MS Teams integration — submit mood via slash command 

- Dark mode support 

- Accessibility — full VoiceOver / TalkBack support 

## **5. Technology Stack** 

## **Constraint** 

The entire stack must be free and open-source. No paid APIs, SDKs, or SaaS services. No credit card required at any point to build, run, or deploy this application. 

## **5.1 Mobile App (Frontend)** 

|**Layer**|**Technology**|**Reason**|
|---|---|---|
|Framework|React Native (Expo SDK 51+)|Free, cross-platform iOS +<br>Android from one codebase;<br>large community|
|Language|TypeScript|Type safety reduces bugs;<br>industry standard|
|Navigation|Expo Router (file-based)|Free, built into Expo; no<br>additional dependencies|
|State Management|Zustand|Lightweight, free, no boilerplate|
|Local Storage|Expo SecureStore +<br>AsyncStorage|Free, device-level; used for<br>personal mood history|
|Animations|React Native Reanimated 3|Free; smooth marble drop<br>animations|
|Charts|Victory Native (open source)|Free charting library for React<br>Native|
|Push Notifications|Expo Notifications|Free up to Expo's limits; no<br>Expo account billing for basic<br>push|
|Styling|NativeWind (Tailwind for RN)|Free, utility-first, fast UI|



MoodMarble — Project Specification  |  Page _5_ of _16_ |  Confidential — Internal Use Only 

|||development|
|---|---|---|
|Icons|Lucide React Native|Free, MIT licence|



## **5.2 Backend (API)** 

|**Layer**|**Technology**|**Reason**|
|---|---|---|
|Runtime|Node.js 20 LTS|Free, widely supported|
|Framework|Fastify|Free, faster than Express,<br>TypeScript-native|
|Language|TypeScript|Consistency with frontend;<br>type-safe API contracts|
|ORM|Drizzle ORM|Free, lightweight, excellent<br>TypeScript types|
|Database|PostgreSQL 16|Free, open source, robust;<br>perfect for analytics queries|
|Caching|Redis (free tier via Upstash or<br>self-host)|Rate limiting, session tokens,<br>leaderboard aggregation|
|Authentication|Custom JWT (no OAuth SaaS)|Join-code based; no email or<br>social login required — fully<br>free|
|Validation|Zod|Free, schema-first validation;<br>shared with frontend|
|API Docs|Swagger (fastify-swagger)|Free, auto-generated from<br>route schemas|



## **5.3 Infrastructure & Deployment** 

|**Component**|**Technology**|**Cost**|
|---|---|---|
|App Hosting|Expo EAS (Expo Application<br>Services)|Free tier includes builds; no<br>credit card for development|
|Backend Hosting|Railway.app or Render.com|Free tier available; $0 for low-<br>traffic apps|
|Database|Railway PostgreSQL or<br>Neon.tech (serverless<br>Postgres)|Free tier — Neon gives 512MB<br>free forever|
|Redis|Upstash Redis|Free tier — 10,000<br>commands/day free|
|File Storage|Not required for MVP|No user-uploaded files in scope|
|Monitoring|Sentry (free tier)|5K errors/month free; crash|



MoodMarble — Project Specification  |  Page _6_ of _16_ |  Confidential — Internal Use Only 

|||reporting for both app and<br>backend|
|---|---|---|
|CI/CD|GitHub Actions|Free for public repos; 2,000<br>min/month for private|



## **6. System Architecture** 

## **6.1 High-Level Architecture** 

MoodMarble follows a simple client-server architecture with a stateless REST API. Personal mood history is stored entirely on-device; only aggregated anonymous data flows to the backend. 

## **Architecture Principle — Privacy by Design** 

Personal mood submissions never leave the device with any user identifier. The backend receives: workspace ID, team ID, mood type, optional tag(s), optional anonymous note, and hour-of-day. No device ID, user ID, IP address, or timestamp is stored server-side. 

## **6.2 Data Flow** 

|**Step**|**Actor**|**Action**|**Data Stored**|
|---|---|---|---|
|1|Team Member|Opens app, selects a<br>marble mood|Local device only|
|2|App|Sends POST /mood to<br>backend|mood_type, team_id,<br>workspace_id,<br>hour_of_day, tags[]|
|3|Backend|Validates, aggregates,<br>stores anonymously|No user identifier<br>whatsoever|
|4|Manager|Opens dashboard —<br>GET<br>/dashboard/team/:id|Only reads aggregated<br>counts and trends|
|5|App|Renders charts from<br>aggregated API<br>response|No individual data in<br>response|



## **6.3 Database Schema (Key Tables)** 

|**Table**|**Key Columns**|**Notes**|
|---|---|---|
|workspaces|id, name, join_code, created_at|Top-level org; join code is 6-<br>char alphanumeric|



MoodMarble — Project Specification  |  Page _7_ of _16_ |  Confidential — Internal Use Only 

|teams|id, workspace_id, name,<br>created_at|A workspace has many teams|
|---|---|---|
|mood_submissions|id, team_id, mood_type, tags[],<br>note_hash, hour_of_day,<br>submission_date|NO user_id. note_hash is<br>SHA-256 of note (for dedup);<br>original text never stored|
|team_members|id, team_id, device_token, role,<br>joined_at|device_token is random UUID<br>generated on install; not linked<br>to Apple/Google account|
|notification_schedules|id, device_token, times[],<br>enabled|Stored locally on device only —<br>not in backend DB|



## **7. API Contract (Core Endpoints)** 

## **7.1 Authentication** 

The app uses a device-generated UUID as an anonymous device token. This token is used only for rate limiting (max 5 submissions/day) and is never stored in the mood_submissions table. 

## **7.2 Endpoints** 

|**Method**|**Endpoint**|**Auth**|**Description**|
|---|---|---|---|
|POST|/workspace/join|None|Join a workspace<br>using a 6-char join<br>code. Returns team list<br>and a signed device<br>JWT.|
|POST|/mood|Device JWT|Submit an anonymous<br>mood entry. Rate-<br>limited to 5/day per<br>device.|
|GET|/dashboard/<br>team/:teamId/daily|Manager JWT|Get today's hourly<br>mood aggregations for<br>a team.|
|GET|/dashboard/<br>team/:teamId/weekly|Manager JWT|Get 7-day mood trend<br>for a team.|
|GET|/dashboard/<br>team/:teamId/tags|Manager JWT|Get top tags by<br>frequency for current<br>week.|
|GET|/health|None|Health check endpoint<br>for deployment<br>monitoring.|
|POST|/admin/team|Admin JWT|Create a new team|



MoodMarble — Project Specification  |  Page _8_ of _16_ |  Confidential — Internal Use Only 

||||within a workspace.|
|---|---|---|---|
|GET|/admin/workspace/:id/<br>export|Admin JWT|Export anonymised<br>mood data as CSV for<br>a date range.|



## **7.3 Sample Request / Response** 

## **POST /mood — Submit a mood** 

**==> picture [469 x 126] intentionally omitted <==**

**----- Start of picture text -----**<br>
Request Body (JSON):<br>{<br>  "team_id": "tm_abc123",<br>  "mood_type": "stressed",<br>  "tags": ["#workload", "#deadlines"],<br>  "hour_of_day": 14<br>}<br>Response 201 Created:<br>{ "status": "received", "marble_id": "mr_9x2yz" }<br>**----- End of picture text -----**<br>


## **8. UI / UX Design Guidelines** 

## **8.1 Design Principles** 

- Frictionless — Mood logged in under 5 seconds from app open 

- Expressive — Marbles are colourful, tactile, and emotionally resonant 

- Private-feeling — No visible login, no profile photo, no names anywhere in the UI 

- Joyful — Animations, haptic feedback, and micro-interactions make it pleasant to use 

- Accessible — Minimum 4.5:1 contrast ratio; labels on all interactive elements 

## **8.2 Screen Map** 

|**Screen**|**Purpose**|**Key Interactions**|
|---|---|---|
|Onboarding (3 slides)|Explain privacy guarantee; join<br>workspace via code|Enter 6-char join code, pick<br>team, done|
|Home / Marble Tray|Main screen; shows 9 marbles<br>in a visual tray|Tap marble → optional tag →<br>optional note → submit|
|Submission Confirmation|Animated marble drop;<br>affirming message|Auto-dismisses after 2s or tap<br>to dismiss|
|My History|Personal timeline of<br>submissions (device-only)|Scroll, filter by mood type, view<br>mood calendar|
|Daily Prompts Settings|Configure notification times|Toggle on/off, set 1–3 times per|



MoodMarble — Project Specification  |  Page _9_ of _16_ |  Confidential — Internal Use Only 

|||day|
|---|---|---|
|Manager Dashboard|Aggregated team mood charts|Date picker, team selector,<br>export button|
|Admin Panel|Create teams, view workspace<br>stats|Create/edit teams, copy join<br>code, export CSV|
|Settings|App preferences, onboarding<br>replay, delete local data|Clear history, change<br>notification settings|



## **8.3 Marble Colour System** 

|**Marble Name**|**Colour**|**Hex Code**|**Emotional Meaning**|
|---|---|---|---|
|Energised|Bright Green|#22C55E|High energy,<br>motivated, ready to go|
|Happy|Sky Blue|#38BDF8|Content, positive,<br>enjoying work|
|Calm|Soft Purple|#A78BFA|Relaxed, focused,<br>balanced|
|Focused|Amber|#FBBF24|In flow, concentrating,<br>productive|
|Neutral|Light Gray|#9CA3AF|Neither good nor bad,<br>just present|
|Tired|Warm Orange|#FB923C|Low energy, needs a<br>break|
|Stressed|Coral Red|#F87171|Overwhelmed,<br>pressure, anxiety|
|Sad|Deep Blue|#60A5FA|Feeling down,<br>demotivated, low|
|Unheard|Charcoal|#4B5563|Concerns ignored,<br>voice not valued|



## **9. Privacy & Anonymity Specification** 

## **Legal Note** 

While MoodMarble collects no PII, the development team should consult with the organisation's legal team regarding DPDPA (India) or GDPR compliance before enterprise deployment. This spec is designed to be compliant by default through data minimisation. 

MoodMarble — Project Specification  |  Page _10_ of _16_ |  Confidential — Internal Use Only 

## **9.1 What We Collect vs. What We Don't** 

|**Data Type**|**Collected?**|**Where Stored**|**Accessible By**|
|---|---|---|---|
|Mood type|Yes|Backend (anonymised)|Manager (aggregated<br>only)|
|Tags|Yes (optional)|Backend (anonymised)|Manager (aggregated<br>only)|
|Hour of day|Yes|Backend (anonymised)|Manager (aggregated<br>only)|
|Free-text notes|No — SHA-256 hash<br>only|Backend (hash, not<br>text)|Nobody — used for<br>dedup only|
|User name / email|Never|N/A|N/A|
|Device ID / IMEI|Never|N/A|N/A|
|IP address|Never logged|N/A|N/A|
|Personal mood history|Yes (device only)|On-device<br>AsyncStorage|The user themselves<br>only|
|GPS / location|Never|N/A|N/A|



## **9.2 Minimum Anonymity Threshold** 

To prevent inference attacks (e.g. a manager deducing who submitted a mood in a small team), the backend enforces: 

- Dashboard data is only shown when a team has 5+ submissions in the time window 

- If a team has fewer than 5 members, aggregated data is further blurred (shown as ranges, not exact counts) 

- Managers cannot filter to a specific hour if fewer than 3 submissions exist in that hour 

## **10. Development Milestones** 

## **10.1 Suggested Sprint Plan (8 Weeks)** 

|**Week**|**Sprint Goal**|**Deliverables**|
|---|---|---|
|Week 1|Project Setup & Architecture|Expo project init, Fastify<br>backend scaffolded,<br>PostgreSQL schema created,<br>GitHub repo with README|
|Week 2|Core Submission Flow|Marble tray UI, mood<br>submission API, rate limiting,<br>submission confirmation<br>animation|



MoodMarble — Project Specification  |  Page _11_ of _16_ |  Confidential — Internal Use Only 

|Week 3|Onboarding & Auth|Join code flow, device JWT<br>issuance, onboarding screens,<br>workspace/team setup|
|---|---|---|
|Week 4|Personal History|Local mood history<br>(AsyncStorage), timeline<br>screen, mood calendar, streak<br>counter|
|Week 5|Dashboard (Manager View)|Aggregated API endpoints,<br>Victory Native charts integrated,<br>daily + weekly views|
|Week 6|Notifications & Settings|Expo push notification setup,<br>configurable prompt times,<br>settings screen|
|Week 7|Admin Panel & Export|Admin UI, team management,<br>CSV export endpoint, join code<br>generation|
|Week 8|Polish, Testing & Deployment|Jest unit tests, E2E with Detox<br>(basic), performance audit,<br>Expo EAS build,<br>Render/Railway deploy|



## **10.2 Definition of Done** 

- All MVP features (Section 4.1) working on both iOS and Android 

- Backend deployed and accessible via HTTPS 

- Anonymity guarantees implemented and verified (Section 9.2) 

- At least 60% unit test coverage on backend API routes 

- App successfully builds via Expo EAS for both platforms 

- README with setup instructions, environment variables, and deployment guide 

## **11. Testing Requirements** 

|**Test Type**|**Tool**|**Coverage Target**|**What to Test**|
|---|---|---|---|
|Unit Tests (Backend)|Jest + Supertest|60% minimum|API routes, anonymity<br>logic, rate limiting,<br>aggregation functions|
|Unit Tests (Frontend)|Jest + React Native<br>Testing Library|40% minimum|Marble selection, form<br>validation, local<br>storage read/write|
|E2E Tests|Detox|Key user journeys only|Onboarding → submit<br>mood → view history;<br>Manager login → view<br>dashboard|



MoodMarble — Project Specification  |  Page _12_ of _16_ |  Confidential — Internal Use Only 

|Manual Testing|Physical device +<br>simulator|All 8 screens|UI consistency,<br>animation<br>performance, dark<br>mode, accessibility|
|---|---|---|---|
|Privacy Audit|Manual code review|Full review|Verify no PII logged<br>anywhere; check<br>network requests in<br>Charles Proxy|



## **12. Non-Functional Requirements** 

|**Performance**|App cold start < 2 seconds. Mood submission round-trip < 500ms on<br>4G. Dashboard loads < 1.5 seconds.|
|---|---|
|**Scalability**|Backend should handle up to 10,000 mood submissions per day<br>without caching changes. Designed to scale horizontally if needed.|
|**Reliability**|API uptime target: 99.5% (achievable on free Railway/Render tier).<br>Graceful offline mode: submissions queued locally and synced when<br>online.|
|**Security**|HTTPS only. JWTs expire in 30 days. Rate limiting: 5 mood<br>submissions per device per day. No sensitive data in error<br>responses.|
|**Maintainability**|TypeScript throughout. ESLint + Prettier enforced via pre-commit<br>hooks. All environment variables in .env files (never hardcoded).|
|**Internationalisation**|English only for v1. i18n-ready architecture using i18next (all strings<br>in locale files from day 1).|



## **13. Repository Structure** 

**==> picture [469 x 181] intentionally omitted <==**

**----- Start of picture text -----**<br>
moodmarble/<br>├── apps/<br>│   ├── mobile/              # React Native Expo app<br>│   │   ├── app/             # Expo Router screens<br>│   │   ├── components/      # Reusable UI components<br>│   │   ├── store/           # Zustand state slices<br>│   │   ├── utils/           # Helpers, constants<br>│   │   └── types/           # Shared TypeScript types<br>│   └── backend/             # Fastify API<br>│       ├── src/<br>│       │   ├── routes/      # API route handlers<br>│       │   ├── services/    # Business logic (mood, aggregation)<br>│       │   ├── db/          # Drizzle schema + migrations<br>│       │   └── middleware/  # Auth, rate limiting, logging<br>│       └── tests/           # Jest test suites<br>├── packages/<br>**----- End of picture text -----**<br>


MoodMarble — Project Specification  |  Page _13_ of _16_ |  Confidential — Internal Use Only 

```
│   └── shared/              # Zod schemas shared between app & backend
├── .github/workflows/       # GitHub Actions CI/CD
├── docker-compose.yml       # Local dev (Postgres + Redis)
└── README.md
```

## **14. Getting Started (Intern Checklist)** 

## **14.1 Environment Setup** 

- Install Node.js 20 LTS, pnpm, and Expo CLI globally 

- Install Docker Desktop for local PostgreSQL and Redis 

- Create accounts (all free, no credit card): GitHub, Expo, Railway or Render, Neon or Supabase, Upstash 

- Clone the repo template provided by your tech lead 

- Copy .env.example to .env and fill in local database URLs 

## **14.2 First Day Goals** 

- Get the Expo app running on your phone via Expo Go 

- Get the Fastify backend running locally with docker-compose up 

- Successfully POST a test mood submission from Postman/Insomnia to the local API 

- Read through this specification document end-to-end and note any questions 

## **14.3 Resources & Documentation** 

|**Resource**|**URL**|
|---|---|
|Expo Documentation|https://docs.expo.dev|
|React Native Docs|https://reactnative.dev/docs/getting-started|
|Fastify Documentation|https://fastify.dev/docs/latest|
|Drizzle ORM Docs|https://orm.drizzle.team/docs/overview|
|NativeWind (Tailwind for RN)|https://www.nativewind.dev/docs|
|Victory Native Charts|https://formidable.com/open-source/victory/<br>docs/native|
|Neon Postgres (free)|https://neon.tech/docs/introduction|
|Upstash Redis (free)|https://upstash.com/docs/redis/overall/getstarted|
|Railway Deployment|https://docs.railway.app|



MoodMarble — Project Specification  |  Page _14_ of _16_ |  Confidential — Internal Use Only 

## **15. Glossary** 

|**15. Glossary**||
|---|---|
|**Marble**|The visual metaphor for a mood. Each of 9 mood states is<br>represented as a coloured marble.|
|**Workspace**|An organisation or company using MoodMarble. Created by an<br>admin with a unique join code.|
|**Team**|A group within a workspace (e.g. Engineering, Design). Mood<br>aggregations are team-scoped.|
|**Device Token**|A randomly generated UUID stored on-device representing an<br>anonymous participant. Not linked to any account.|
|**Aggregation**|The process of combining many individual anonymous submissions<br>into summary counts and trends — the only data managers ever<br>see.|
|**Minimum Threshold**|The rule that dashboard data is only shown if 5+ submissions exist,<br>preventing identification in small teams.|
|**Join Code**|A 6-character alphanumeric code used to join a workspace. No<br>email or login required.|
|**EAS**|Expo Application Services — Expo's free cloud build service for<br>generating iOS and Android app binaries.|



## **16. Sign-Off & Contact** 

This document is the single source of truth for the MoodMarble MVP. Any changes to scope, technology choices, or design must be agreed upon with the project owner and documented as a version update to this spec. 

|**Role**|**Name**|**Responsibility**|
|---|---|---|
|Project Owner|TBD|Final approval on product<br>decisions and scope changes|
|Tech Lead|TBD|Architecture review, code<br>review, deployment sign-off|
|Intern Developer|TBD|Design, development, testing,<br>and delivery per this spec|
|Designer (optional)|TBD|Figma mockups for marble tray<br>and dashboard screens|



## **Questions?** 

If any part of this specification is unclear, raise it in the team Slack channel or tag your tech lead in a 

MoodMarble — Project Specification  |  Page _15_ of _16_ |  Confidential — Internal Use Only 

GitHub Discussion on the repo. Do not make assumptions on privacy-critical decisions — always ask. 

_— End of MoodMarble Project Specification v1.0 —_ 

MoodMarble — Project Specification  |  Page _16_ of _16_ |  Confidential — Internal Use Only 

