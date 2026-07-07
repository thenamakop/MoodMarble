# Week 8 Handoff

## Purpose

This handoff closes the Admin Authentication rebuild and E2E coverage sprint. The administrative login flow is now complete, verified, and integrated into both the backend API and the mobile application.

The source of truth remains:

- `MoodMarble_Project_Specification.docx`

## Week 8 Admin Auth & E2E Stable State

The repository has been updated with the following completed capabilities:

- A secure, dedicated `/auth/login` flow for administrators.
- Rejection of unregistered or invalid admin login attempts safely, yielding proper `401 Unauthorized`.
- An idempotent backend seed script `pnpm seed:admin` that cleanly sets up the admin identity.
- Explicit session separation where member and manager tokens (`device_jwt` and `manager_jwt`) cannot fulfill `admin_jwt` requirements.
- A functional admin entry point on the mobile UI that provides a first-class login view, securely restoring the admin session upon app restart.
- Comprehensive unit tests covering the backend `seedAdmin` behavior and rate-limit boundaries.
- Dedicated Detox UI interactions in `helpers.cjs` simulating a true admin login without brittle backend overrides.
- Validated E2E journey via `admin-journey.e2e.cjs` covering login, session restoration across restarts, and secure logout.

These capabilities touch:

- `apps/backend/src/app.ts`
- `apps/backend/src/routes/auth.ts`
- `apps/backend/scripts/seed-admin.ts`
- `apps/backend/tests/routes/auth.test.ts`
- `apps/backend/tests/scripts/seed-admin.test.ts`
- `apps/mobile/e2e/helpers.cjs`
- `apps/mobile/e2e/admin-journey.e2e.cjs`
- `apps/mobile/src/app/admin-login.tsx`

## Verified Baseline

The following previously implemented features remain explicitly verified and unmodified during this sprint:

- Week 3: Anonymous onboarding and session persistence.
- Week 4: Local-only personal history.
- Week 5: Manager dashboard queries, privacy thresholds, and analytics.
- Week 6: Local reminders and settings.
- Week 7: The admin panel functionality (team management, join code rotation, anonymized CSV exports).

The new auth features fit naturally into this ecosystem without leaking identities into member routes or circumventing privacy thresholds.

## Operational Note

To boot the repository with the new admin capabilities locally:

1. **Seed the Database:**

   ```bash
   cd apps/backend
   pnpm db:seed
   pnpm seed:admin
   ```

   _(This uses environment variables `ADMIN_EMAIL`, `ADMIN_PASSWORD` from `.env` to create the admin account idempotently)._

2. **Run Backend:**

   ```bash
   cd apps/backend
   pnpm dev
   ```

3. **Run Mobile Client:**

   ```bash
   cd apps/mobile
   pnpm start
   ```

4. **Run E2E Tests (Android):**
   ```bash
   cd apps/mobile
   pnpm e2e:android:preflight
   pnpm e2e:android:build
   pnpm e2e:android:test:headless
   ```

## Post-Week 8 Hardening

After the Week 8 deliverables were finalised, the following fixes and operational improvements landed:

- **Dashboard seeding for visible E2E data:** `seedDashboardFixtures()` in `apps/backend/src/routes/test-fixtures.ts` now seeds 6 deterministic team members and 8 submissions per day across the E2E manager window (`2026-06-16` → `2026-06-22`) and the current ISO week. `pnpm seed:dashboard` is available for manual dev runs, and `POST /__test/reset` automatically calls the same seeder.
- **Dashboard privacy thresholds remain enforced:** the backend still hides/blurs output below 5 submissions in a window, 5 team members, or 3 submissions in an hour bucket.
- **Daily heatmap label fix:** overlapping per-point labels in `apps/mobile/src/features/dashboard/dashboard-charts.tsx` (and its web variant) were removed, eliminating the unreadable black line above the heatmap squares.
- **Member journey E2E hardening:** `apps/mobile/e2e/member-journey.e2e.cjs` and `apps/mobile/e2e/helpers.cjs` were stabilised around onboarding skip reliability, history navigation, settings scroll position, submission-confirmation overlay timing, and the on-screen keyboard.
- **Manager join-code flow:** remains verified via `apps/mobile/e2e/manager-join-code-journey.e2e.cjs` and the direct manager deep-link in `apps/mobile/e2e/manager-journey.e2e.cjs`.

## Remaining Gaps / Intentionally Out of Scope

The following features remain explicitly omitted from the MVP scope and the current codebase:

- **Admin "Forgot Password" or Sign-Up:** There is no public interface to register a new admin or reset a password. The system is closed by design. Password recovery requires database intervention or using the `seed:admin` script with an alternate email.
- **Multiple Administrators:** The UI assumes a single admin context based on the seeded credentials.
- **iOS E2E Testing:** E2E test suites remain strictly focused on Android emulator behavior (Pixel 8) to reduce environment setup complexity.

The project is now ready for future feature iteration (e.g. CI/CD finalizations, string translations, and API documentation) as outlined in `docs/task-tracker.md`.
