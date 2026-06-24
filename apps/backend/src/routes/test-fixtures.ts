import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { DatabaseClient } from "../db/client";
import { seedAdmin } from "../../scripts/seed-admin";
import { workspaces, teams } from "../db/schema";

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
      // 1. Clear database state
      await databaseClient.db.execute(sql`
        TRUNCATE TABLE workspaces, teams, team_members, mood_submissions, admin_credentials CASCADE;
      `);

      // 2. Reseed workspace & team
      await databaseClient.db.insert(workspaces).values({
        id: "ws_localdemo",
        name: "MoodMarble Local Workspace",
        joinCode: "ABC123",
      });

      await databaseClient.db.insert(teams).values({
        id: "tm_product",
        workspaceId: "ws_localdemo",
        name: "Product",
      });

      // 3. Reseed admin account
      const seedExitCode = await seedAdmin(
        "admin@example.com",
        "change-this-password-in-prod",
        databaseClient,
      );

      if (seedExitCode !== 0) {
        return reply.status(500).send({ message: "Failed to seed admin" });
      }

      return reply.status(200).send({ status: "reset_ok" });
    } catch (error) {
      console.error("Test reset failed:", error);
      return reply.status(500).send({ message: "Test reset failed", error: String(error) });
    }
  });
}
