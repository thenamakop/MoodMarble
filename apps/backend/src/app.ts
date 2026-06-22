import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { registerAdminRoutes } from "./routes/admin";
import { registerDashboardDailyRoute } from "./routes/dashboard-daily";
import { registerDashboardTagsRoute } from "./routes/dashboard-tags";
import { registerDashboardWeeklyRoute } from "./routes/dashboard-weekly";
import { registerHealthRoutes } from "./routes/health";
import { registerMoodRoute } from "./routes/mood";
import { registerWorkspaceJoinRoute } from "./routes/workspace-join";
import {
  InMemoryAdminApiService,
  NotImplementedAdminApiService,
  type AdminApiService,
} from "./services/admin-api";
import {
  InMemoryDashboardAnalyticsSource,
  type DashboardAnalyticsSource,
} from "./services/dashboard-daily";
import {
  InMemoryMoodSubmissionStore,
  type MoodSubmissionStore,
} from "./services/mood-submissions";
import {
  InMemorySubmissionRateLimiter,
  type SubmissionRateLimiter,
} from "./services/submission-rate-limit";
import {
  InMemoryWorkspaceDirectory,
  type WorkspaceDirectory,
} from "./services/workspace-directory";

interface BuildAppOptions {
  jwtSecret?: string;
  adminBootstrapSecret?: string;
  adminApiService?: AdminApiService;
  dashboardAnalyticsSource?: DashboardAnalyticsSource;
  moodSubmissionStore?: MoodSubmissionStore;
  workspaceDirectory?: WorkspaceDirectory;
  submissionRateLimiter?: SubmissionRateLimiter;
  now?: () => Date;
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify();
  const workspaceDirectory =
    options.workspaceDirectory ?? new InMemoryWorkspaceDirectory();
  const moodSubmissionStore =
    options.moodSubmissionStore ?? new InMemoryMoodSubmissionStore();

  await app.register(cors, {
    origin: [/^https?:\/\/localhost:\d+$/u, /^https?:\/\/127\.0\.0\.1:\d+$/u],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-admin-bootstrap-secret",
    ],
  });

  await registerHealthRoutes(app);
  await registerAdminRoutes(app, {
    jwtSecret: options.jwtSecret,
    adminBootstrapSecret: options.adminBootstrapSecret,
    adminApiService:
      options.adminApiService ??
      createDefaultAdminApiService({
        jwtSecret: options.jwtSecret,
        workspaceDirectory,
        moodSubmissionStore,
      }),
  });
  await registerWorkspaceJoinRoute(app, {
    jwtSecret: options.jwtSecret,
    workspaceDirectory,
  });
  await registerDashboardDailyRoute(app, {
    jwtSecret: options.jwtSecret,
    analyticsSource:
      options.dashboardAnalyticsSource ??
      new InMemoryDashboardAnalyticsSource(),
    workspaceDirectory,
    now: options.now,
  });
  await registerDashboardWeeklyRoute(app, {
    jwtSecret: options.jwtSecret,
    analyticsSource:
      options.dashboardAnalyticsSource ??
      new InMemoryDashboardAnalyticsSource(),
    workspaceDirectory,
    now: options.now,
  });
  await registerDashboardTagsRoute(app, {
    jwtSecret: options.jwtSecret,
    analyticsSource:
      options.dashboardAnalyticsSource ??
      new InMemoryDashboardAnalyticsSource(),
    workspaceDirectory,
    now: options.now,
  });
  await registerMoodRoute(app, {
    jwtSecret: options.jwtSecret,
    moodSubmissionStore,
    workspaceDirectory,
    submissionRateLimiter:
      options.submissionRateLimiter ?? new InMemorySubmissionRateLimiter(),
    now: options.now,
  });

  return app;
}

function createDefaultAdminApiService(options: {
  jwtSecret?: string;
  workspaceDirectory: WorkspaceDirectory;
  moodSubmissionStore: MoodSubmissionStore;
}): AdminApiService {
  if (
    options.workspaceDirectory instanceof InMemoryWorkspaceDirectory &&
    options.moodSubmissionStore instanceof InMemoryMoodSubmissionStore
  ) {
    return new InMemoryAdminApiService({
      jwtSecret: options.jwtSecret,
      workspaceDirectory: options.workspaceDirectory,
      moodSubmissionStore: options.moodSubmissionStore,
    });
  }

  return new NotImplementedAdminApiService();
}
