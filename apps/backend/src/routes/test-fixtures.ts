import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { DatabaseClient } from "../db/client";
import { seedAdmin } from "../../scripts/seed-admin";
import { workspaces, teams, managerCodes } from "../db/schema";

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
