import Redis from "ioredis";

import { buildApp } from "./app";
import { getAppEnv } from "./config/env";
import { createDatabaseClient, verifyDatabaseConnection } from "./db/client";
import { PostgresDashboardAnalyticsSource } from "./services/dashboard-daily";
import { PostgresMoodSubmissionStore } from "./services/mood-submissions";
import { RedisSubmissionRateLimiter } from "./services/submission-rate-limit";
import { PostgresWorkspaceDirectory } from "./services/workspace-directory";

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
    dashboardAnalyticsSource: new PostgresDashboardAnalyticsSource(
      databaseClient,
    ),
    moodSubmissionStore: new PostgresMoodSubmissionStore(databaseClient),
    submissionRateLimiter: new RedisSubmissionRateLimiter(redis),
    workspaceDirectory: new PostgresWorkspaceDirectory(databaseClient),
  });

  app.addHook("onClose", async () => {
    await redis.quit();
    await databaseClient.close();
  });

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  console.log(`Backend listening on http://127.0.0.1:${env.PORT}`);
}

void startServer();
