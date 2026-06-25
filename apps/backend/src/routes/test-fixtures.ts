import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import type { DatabaseClient } from "../db/client";
import { seedAdmin } from "../../scripts/seed-admin";
import {
  workspaces,
  teams,
  managerCodes,
  teamMembers,
  moodSubmissions,
} from "../db/schema";
import { clearLoginRateLimit } from "./auth";

// ---------------------------------------------------------------------------
// Dashboard fixture seeder — clears and re-populates team_members and
// mood_submissions for tm_product so all privacy thresholds are cleared:
//   • minimum_submissions      ≥ 5  → visible (not hidden)
//   • minimum_members_for_precise_values ≥ 5  → precise (not blurred)
//   • minimum_hourly_submissions ≥ 3  → each seeded hour bucket visible
//
// Submissions are anchored to today (UTC) for the daily view and spread
// across the current ISO week (Mon–Sun) for the weekly view.
// ---------------------------------------------------------------------------
export async function seedDashboardFixtures(
  databaseClient: DatabaseClient,
  teamId = "tm_product",
): Promise<void> {
  // Today in UTC — daily dashboard queries this exact date.
  const todayKey = new Date().toISOString().slice(0, 10);

  // Start of current ISO week (Monday) for the weekly window.
  const todayDate = new Date(todayKey + "T00:00:00Z");
  const dayOfWeek = todayDate.getUTCDay(); // 0=Sun … 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayDate);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  // Seed 6 distinct team members (> threshold of 5).
  const memberDeviceTokens = Array.from({ length: 6 }, () =>
    crypto.randomUUID(),
  );
  for (const deviceToken of memberDeviceTokens) {
    await databaseClient.db
      .insert(teamMembers)
      .values({
        id: `seed-member-${deviceToken.slice(0, 8)}`,
        teamId,
        deviceToken,
        role: "member",
      })
      .onConflictDoNothing();
  }

  // Build submissions — diverse moods/tags across the week.
  // Rules:
  //   1. Today gets 8 submissions spread across 3 hours (≥ 3 per hour → each
  //      hour bucket is visible in the daily heatmap).
  //   2. The rest of the current week gets 2 submissions per day (so the
  //      weekly window always has well over 5 total).
  //   3. All previous days in the week use noon (hour 12) to keep it simple.
  type MoodType =
    | "energised"
    | "happy"
    | "calm"
    | "focused"
    | "neutral"
    | "tired"
    | "stressed"
    | "sad"
    | "unheard";
  const todaySubmissions: Array<{
    moodType: MoodType;
    tags: string[];
    hour: number;
  }> = [
    // Hour 9 — 3 submissions (meets minimum_hourly_submissions)
    { moodType: "happy", tags: ["#team"], hour: 9 },
    { moodType: "energised", tags: ["#workload"], hour: 9 },
    { moodType: "calm", tags: [], hour: 9 },
    // Hour 14 — 3 submissions
    { moodType: "stressed", tags: ["#workload", "#deadlines"], hour: 14 },
    { moodType: "tired", tags: ["#deadlines"], hour: 14 },
    { moodType: "focused", tags: ["#team"], hour: 14 },
    // Hour 17 — 2 extra (bonus variety)
    { moodType: "neutral", tags: [], hour: 17 },
    { moodType: "happy", tags: ["#team"], hour: 17 },
  ];

  for (const { moodType, tags, hour } of todaySubmissions) {
    await databaseClient.db
      .insert(moodSubmissions)
      .values({
        id: `seed-today-${crypto.randomUUID().slice(0, 8)}`,
        teamId,
        moodType,
        tags,
        hourOfDay: hour,
        submissionDate: todayKey,
      })
      .onConflictDoNothing();
  }

  // Add 2 submissions per earlier day in the week (skip today — already done).
  const weeklyMoods: MoodType[] = [
    "calm",
    "focused",
    "happy",
    "energised",
    "neutral",
    "tired",
  ];
  for (const [index, date] of weekDates.entries()) {
    if (date === todayKey) continue;
    const mood1 = weeklyMoods[index % weeklyMoods.length]!;
    const mood2 = weeklyMoods[(index + 1) % weeklyMoods.length]!;
    await databaseClient.db
      .insert(moodSubmissions)
      .values([
        {
          id: `seed-week-${date}-a`,
          teamId,
          moodType: mood1,
          tags: ["#team"],
          hourOfDay: 10,
          submissionDate: date,
        },
        {
          id: `seed-week-${date}-b`,
          teamId,
          moodType: mood2,
          tags: [],
          hourOfDay: 15,
          submissionDate: date,
        },
      ])
      .onConflictDoNothing();
  }
}

export interface TestFixturesOptions {
  databaseClient: DatabaseClient;
}

export async function registerTestRoutes(
  app: FastifyInstance,
  options: TestFixturesOptions,
): Promise<void> {
  app.post("/__test/reset", async (request, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ message: "Forbidden in production" });
    }

    const { databaseClient } = options;

    // Always clear the in-memory login rate limit first so that previous
    // failed login attempts during a test run never block the next run.
    clearLoginRateLimit();

    try {
      // 1. Clear tables in reverse FK dependency order.
      //    Using individual DELETE statements instead of a single TRUNCATE so
      //    that a missing table (e.g. migration not yet run) skips gracefully
      //    instead of aborting the entire reset.
      const tablesToClear = [
        "mood_submissions",
        "team_members",
        "admin_credentials",
        "manager_codes",
        "teams",
        "workspaces",
      ] as const;

      for (const table of tablesToClear) {
        try {
          await databaseClient.db.execute(sql.raw(`DELETE FROM "${table}"`));
        } catch (tableError) {
          // Table may not exist yet if migrations are pending — log and continue.
          console.warn(
            `[test-reset] Skipped clearing "${table}": ${String(tableError)}`,
          );
        }
      }

      // 2. Reseed workspace
      await databaseClient.db.insert(workspaces).values({
        id: "ws_localdemo",
        name: "MoodMarble Local Workspace",
        joinCode: "ABC123",
      });

      // 3. Reseed team
      await databaseClient.db.insert(teams).values({
        id: "tm_product",
        workspaceId: "ws_localdemo",
        name: "Product",
      });

      // 4. Reseed admin account
      const seedExitCode = await seedAdmin(
        "admin@example.com",
        "password1234",
        databaseClient,
      );

      if (seedExitCode !== 0) {
        return reply.status(500).send({
          message: "Failed to seed admin account",
          hint: "Check that ADMIN_EMAIL and ADMIN_PASSWORD are valid and bcryptjs is installed.",
        });
      }

      // 5. Seed a known manager code for E2E tests (6-char alphanumeric)
      const codeExpiresAt = new Date();
      codeExpiresAt.setDate(codeExpiresAt.getDate() + 30);

      try {
        await databaseClient.db.insert(managerCodes).values({
          id: "mgr-code-e2e-001",
          code: "MGR001",
          workspaceId: "ws_localdemo",
          teamId: "tm_product",
          expiresAt: codeExpiresAt,
        });
      } catch {
        // manager_codes table may not exist yet if migration is pending — non-fatal
        console.warn(
          "[test-reset] Could not seed manager code (migration may be pending)",
        );
      }

      // 6. Seed dashboard fixtures so all privacy thresholds are cleared
      //    — both for manual dev sessions and E2E tests.
      await seedDashboardFixtures(databaseClient);

      return reply.status(200).send({ status: "reset_ok" });
    } catch (error) {
      // Return the actual error message so it is visible in E2E console output
      // without having to tail server logs. Never do this in production.
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[test-reset] Reset failed:", errorMessage);
      return reply.status(500).send({
        message: "Test reset failed",
        error: errorMessage,
      });
    }
  });
}
