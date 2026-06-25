/**
 * seed-dashboard.ts
 *
 * Populates team_members and mood_submissions for the local demo workspace
 * so that all three privacy thresholds are cleared and the manager dashboard
 * shows real charts instead of hidden/blurred placeholders.
 *
 * Thresholds cleared:
 *   minimum_submissions                ≥ 5  → values visible (not hidden)
 *   minimum_members_for_precise_values ≥ 5  → values precise (not blurred)
 *   minimum_hourly_submissions         ≥ 3  → each seeded hour bucket visible
 *
 * Usage:
 *   npm run seed:dashboard            (from apps/backend/)
 *
 * Safe to run multiple times — uses onConflictDoNothing.
 */
import { createDatabaseClient } from "../src/db/client";
import { loadLocalEnvFile, getAppEnv } from "../src/config/env";
import { seedDashboardFixtures } from "../src/routes/test-fixtures";

async function main() {
  loadLocalEnvFile();
  const env = getAppEnv();
  const databaseClient = createDatabaseClient(env.DATABASE_URL);

  try {
    console.log("[seed-dashboard] Seeding dashboard fixtures...");
    await seedDashboardFixtures(databaseClient);
    console.log("[seed-dashboard] Done. Team members and submissions seeded.");
    console.log(
      "[seed-dashboard] Open the manager dashboard — all charts should be visible.",
    );
  } catch (error) {
    console.error("[seed-dashboard] Failed:", error);
    process.exit(1);
  } finally {
    await databaseClient.close();
  }
}

void main();
