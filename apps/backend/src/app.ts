import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { registerAuthRoutes } from "./routes/auth";
import { registerAdminRoutes } from "./routes/admin";
import { registerDashboardDailyRoute } from "./routes/dashboard-daily";
import { registerDashboardTagsRoute } from "./routes/dashboard-tags";
import { registerDashboardWeeklyRoute } from "./routes/dashboard-weekly";
import { registerHealthRoutes } from "./routes/health";
import { registerMoodRoute } from "./routes/mood";
import { registerWorkspaceJoinRoute } from "./routes/workspace-join";
import { registerTestRoutes } from "./routes/test-fixtures";
import {
  InMemoryAdminApiService,
  NotImplementedAdminApiService,
  type AdminApiService,
} from "./services/admin-api";
import {
  InMemoryDashboardAnalyticsSource,
  type DashboardAnalyticsSource,
} from "./services/dashboard-daily";
import { InMemoryMoodSubmissionStore, type MoodSubmissionStore } from "./services/mood-submissions";
import {
  InMemorySubmissionRateLimiter,
  type SubmissionRateLimiter,
} from "./services/submission-rate-limit";
import { InMemoryTeamMembershipStore, type TeamMembershipStore } from "./services/team-members";
import {
  InMemoryWorkspaceDirectory,
  type WorkspaceDirectory,
} from "./services/workspace-directory";

interface BuildAppOptions {
  jwtSecret?: string;
  adminBootstrapSecret?: string;
  corsOrigin?: string;
  adminApiService?: AdminApiService;
  dashboardAnalyticsSource?: DashboardAnalyticsSource;
  moodSubmissionStore?: MoodSubmissionStore;
  workspaceDirectory?: WorkspaceDirectory;
  submissionRateLimiter?: SubmissionRateLimiter;
  teamMembershipStore?: TeamMembershipStore;
  now?: () => Date;
  databaseClient?: import("./db/client").DatabaseClient;
}

/**
 * Creates a configured Fastify app with API documentation, CORS, and route registrations.
 *
 * Uses in-memory defaults for optional workspace, mood, membership, analytics, and rate-limiting dependencies.
 *
 * @param options - Build configuration and optional dependencies.
 * @returns The configured Fastify instance.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify();
  const workspaceDirectory = options.workspaceDirectory ?? new InMemoryWorkspaceDirectory();
  const moodSubmissionStore = options.moodSubmissionStore ?? new InMemoryMoodSubmissionStore();

  const productionOrigin = options.corsOrigin
    ? [new RegExp(`^${options.corsOrigin.replace(/\./g, "\\.")}$`, "u")]
    : [];

  await app.register(cors, {
    origin: [/^https?:\/\/localhost:\d+$/u, /^https?:\/\/127\.0\.0\.1:\d+$/u, ...productionOrigin],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-bootstrap-secret"],
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "MoodMarble API",
        description: [
          "Anonymous workplace mood-tracking API.",
          "",
          "**Authentication schemes:**",
          "- `deviceJwt` — issued after `POST /workspace/join`.",
          "  Identifies an anonymous device. Used for mood submission.",
          "- `managerJwt` — issued after `POST /auth/redeem-manager-code`.",
          "  Grants access to the team dashboard for one team.",
          "- `adminJwt` — issued after `POST /auth/login`.",
          "  Grants full workspace administration access.",
        ].join("\n"),
        version: "1.0.0",
      },
      tags: [
        { name: "Public", description: "No authentication required" },
        { name: "Device", description: "Requires Device JWT (Bearer)" },
        { name: "Manager", description: "Requires Manager JWT (Bearer)" },
        { name: "Admin", description: "Requires Admin JWT (Bearer)" },
      ],
      components: {
        securitySchemes: {
          deviceJwt: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Issued by POST /workspace/join. 30-day expiry. " +
              "Identifies an anonymous device — never linked to a name or email.",
          },
          managerJwt: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Issued by POST /auth/redeem-manager-code. 30-day expiry. " +
              "Scoped to a single team within a workspace.",
          },
          adminJwt: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Issued by POST /auth/login. 30-day expiry. " +
              "Full workspace administration access.",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
      persistAuthorization: true,
    },
    staticCSP: true,
  });

  await registerHealthRoutes(app);
  if (options.databaseClient) {
    await registerAuthRoutes(app, {
      jwtSecret: options.jwtSecret,
      databaseClient: options.databaseClient,
    });

    if (process.env.NODE_ENV !== "production") {
      await registerTestRoutes(app, {
        databaseClient: options.databaseClient,
      });
    }
  }
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
    databaseClient: options.databaseClient,
  });
  await registerWorkspaceJoinRoute(app, {
    jwtSecret: options.jwtSecret,
    teamMembershipStore: options.teamMembershipStore ?? new InMemoryTeamMembershipStore(),
    workspaceDirectory,
  });
  await registerDashboardDailyRoute(app, {
    jwtSecret: options.jwtSecret,
    analyticsSource: options.dashboardAnalyticsSource ?? new InMemoryDashboardAnalyticsSource(),
    workspaceDirectory,
    now: options.now,
  });
  await registerDashboardWeeklyRoute(app, {
    jwtSecret: options.jwtSecret,
    analyticsSource: options.dashboardAnalyticsSource ?? new InMemoryDashboardAnalyticsSource(),
    workspaceDirectory,
    now: options.now,
  });
  await registerDashboardTagsRoute(app, {
    jwtSecret: options.jwtSecret,
    analyticsSource: options.dashboardAnalyticsSource ?? new InMemoryDashboardAnalyticsSource(),
    workspaceDirectory,
    now: options.now,
  });
  await registerMoodRoute(app, {
    jwtSecret: options.jwtSecret,
    moodSubmissionStore,
    workspaceDirectory,
    submissionRateLimiter: options.submissionRateLimiter ?? new InMemorySubmissionRateLimiter(),
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
