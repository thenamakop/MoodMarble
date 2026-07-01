import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { DatabaseClient } from "../db/client";
import { seedAdmin } from "../../scripts/seed-admin";
import { workspaces, teams, managerCodes, teamMembers, moodSubmissions } from "../db/schema";
import { clearLoginRateLimit } from "./auth";

// ---------------------------------------------------------------------------
// Dashboard fixture seeder — populates team_members and mood_submissions for
// tm_product so that every date window the app can load is above all privacy
// thresholds:
//   • minimum_submissions                ≥ 5  → visible (not hidden)
//   • minimum_members_for_precise_values ≥ 5  → precise (not blurred)
//   • minimum_hourly_submissions         ≥ 3  → each seeded hour bucket visible
//
// Coverage:
//   1. The fixed E2E manager window (2026-06-16 → 2026-06-22).
//   2. The current ISO week up to today.
//
// Each covered day gets a full daily cluster of 8 submissions, so the daily
// heatmap is visible regardless of which date is selected.
// ---------------------------------------------------------------------------

const DASHBOARD_E2E_WINDOW_START = "2026-06-16";

type DashboardMoodType =
  "energised" | "happy" | "calm" | "focused" | "neutral" | "tired" | "stressed" | "sad" | "unheard";

const DASHBOARD_DAILY_CLUSTER: Array<{
  moodType: DashboardMoodType;
  tags: string[];
  hour: number;
}> = [
  { moodType: "happy", tags: ["#team"], hour: 9 },
  { moodType: "energised", tags: ["#workload"], hour: 9 },
  { moodType: "calm", tags: [], hour: 9 },
  { moodType: "stressed", tags: ["#workload", "#deadlines"], hour: 14 },
  { moodType: "tired", tags: ["#deadlines"], hour: 14 },
  { moodType: "focused", tags: ["#team"], hour: 14 },
  { moodType: "neutral", tags: [], hour: 17 },
  { moodType: "happy", tags: ["#team"], hour: 17 },
];

function getDashboardDateKeysInRange(startKey: string, endKey: string): string[] {
  const start = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey}T00:00:00.000Z`);
  const keys: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    keys.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return keys;
}

export async function seedDashboardFixtures(
  databaseClient: DatabaseClient,
  teamId = "tm_product",
): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const rangeStart = DASHBOARD_E2E_WINDOW_START;
  const rangeEnd = todayKey;

  // If the system clock is somehow before the E2E window, still seed today.
  const dateKeys =
    rangeEnd < rangeStart ? [todayKey] : getDashboardDateKeysInRange(rangeStart, rangeEnd);

  // Seed 6 distinct team members (> threshold of 5). Use deterministic ids
  // so the manual seed script is idempotent.
  for (let index = 0; index < 6; index += 1) {
    await databaseClient.db
      .insert(teamMembers)
      .values({
        id: `seed-member-${index}`,
        teamId,
        deviceToken: `10000000-0000-0000-0000-00000000000${index}`,
        role: "member",
      })
      .onConflictDoNothing();
  }

  // Seed a full daily cluster for every covered day.
  for (const dateKey of dateKeys) {
    for (const [index, { moodType, tags, hour }] of DASHBOARD_DAILY_CLUSTER.entries()) {
      await databaseClient.db
        .insert(moodSubmissions)
        .values({
          id: `seed-${dateKey}-${index}`,
          teamId,
          moodType,
          tags,
          hourOfDay: hour,
          submissionDate: dateKey,
        })
        .onConflictDoNothing();
    }
  }
}

export interface TestFixturesOptions {
  databaseClient: DatabaseClient;
}

export async function registerTestRoutes(
  app: FastifyInstance,
  options: TestFixturesOptions,
): Promise<void> {
  app.post("/__test/reset", { schema: { hide: true } }, async (request, reply) => {
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
          console.warn(`[test-reset] Skipped clearing "${table}": ${String(tableError)}`);
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
      const seedExitCode = await seedAdmin("admin@example.com", "password1234", databaseClient);

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
        console.warn("[test-reset] Could not seed manager code (migration may be pending)");
      }

      // 6. Seed dashboard fixtures so all privacy thresholds are cleared
      //    — both for manual dev sessions and E2E tests.
      await seedDashboardFixtures(databaseClient);

      return reply.status(200).send({ status: "reset_ok" });
    } catch (error) {
      // Return the actual error message so it is visible in E2E console output
      // without having to tail server logs. Never do this in production.
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[test-reset] Reset failed:", errorMessage);
      return reply.status(500).send({
        message: "Test reset failed",
        error: errorMessage,
      });
    }
  });
}
