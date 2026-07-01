import Redis from "ioredis";

import { buildApp } from "./app";
import { getAppEnv } from "./config/env";
import { createDatabaseClient, verifyDatabaseConnection } from "./db/client";
import { PostgresAdminApiService } from "./services/admin-api";
import { PostgresDashboardAnalyticsSource } from "./services/dashboard-daily";
import { PostgresMoodSubmissionStore } from "./services/mood-submissions";
import { RedisSubmissionRateLimiter } from "./services/submission-rate-limit";
import { PostgresTeamMembershipStore } from "./services/team-members";
import { PostgresWorkspaceDirectory } from "./services/workspace-directory";

/**
 * Starts the application server.
 *
 * Initializes database and Redis connections, builds the app, and begins listening on the configured host and port.
 */

async function startServer(): Promise<void> {
  const env = getAppEnv();
  const databaseClient = createDatabaseClient(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
  });

  await verifyDatabaseConnection(databaseClient);
  await redis.connect();

  const app = await buildApp({
    jwtSecret: env.JWT_SECRET,
    adminBootstrapSecret: env.ADMIN_BOOTSTRAP_SECRET,
    corsOrigin: env.CORS_ORIGIN,
    databaseClient,
    adminApiService: new PostgresAdminApiService({
      databaseClient,
      jwtSecret: env.JWT_SECRET,
    }),
    dashboardAnalyticsSource: new PostgresDashboardAnalyticsSource(databaseClient),
    moodSubmissionStore: new PostgresMoodSubmissionStore(databaseClient),
    submissionRateLimiter: new RedisSubmissionRateLimiter(redis),
    teamMembershipStore: new PostgresTeamMembershipStore(databaseClient),
    workspaceDirectory: new PostgresWorkspaceDirectory(databaseClient),
  });

  app.addHook("onRequest", async (request, reply) => {
    console.log(`[REQ] ${request.method} ${request.url}`);
  });
  app.addHook("onResponse", async (request, reply) => {
    console.log(`[RES] ${request.method} ${request.url} - ${reply.statusCode}`);
  });
  app.addHook("onError", async (request, reply, error) => {
    console.error(`[ERR] ${request.method} ${request.url}`, error);
  });

  app.addHook("onClose", async () => {
    await redis.quit();
    await databaseClient.close();
  });

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  console.log(`[MoodMarble] Server ready — http://${env.HOST}:${env.PORT}`);
}

void startServer();
