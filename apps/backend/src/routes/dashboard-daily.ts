import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, z } from "zod";

import { SubmissionDateSchema, TeamIdSchema } from "../../../../packages/shared";
import { MissingJwtSecretError, UnauthorizedError } from "../auth/device-jwt";
import { verifyManagerJwt } from "../auth/manager-jwt";
import { type DashboardAnalyticsSource, DailyDashboardService } from "../services/dashboard-daily";
import type { WorkspaceDirectory } from "../services/workspace-directory";

const DashboardDailyParamsSchema = z
  .object({
    teamId: TeamIdSchema,
  })
  .strict();

const DashboardDailyQuerySchema = z
  .object({
    date: SubmissionDateSchema.optional(),
  })
  .strict();

interface RegisterDashboardDailyRouteOptions {
  jwtSecret?: string;
  analyticsSource: DashboardAnalyticsSource;
  workspaceDirectory: WorkspaceDirectory;
  now?: () => Date;
}

export async function registerDashboardDailyRoute(
  app: FastifyInstance,
  options: RegisterDashboardDailyRouteOptions,
): Promise<void> {
  const dailyDashboardService = new DailyDashboardService({
    analyticsSource: options.analyticsSource,
    now: options.now,
  });

  app.get(
    "/dashboard/team/:teamId/daily",
    {
      schema: {
        tags: ["Manager"],
        summary: "Daily mood heatmap",
        security: [{ managerJwt: [] }],
        description:
          "Returns hourly mood aggregates for the team on a given " +
          "date. Privacy-enforced: data is hidden when total submissions < 5. " +
          "Hours with < 3 submissions are individually hidden. " +
          "Includes a mood alert if average score is low for 3+ consecutive hours.",
        params: {
          type: "object",
          additionalProperties: true,
          required: ["teamId"],
          properties: {
            teamId: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          additionalProperties: true,
          properties: {
            date: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "YYYY-MM-DD. Defaults to today in the server timezone.",
            },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            description:
              "Aggregated daily mood data. Individual hour buckets " +
              "may be hidden by privacy enforcement.",
            properties: {
              team_id: { type: "string" },
              date: { type: "string" },
              alert_state: {
                type: "object",
                additionalProperties: true,
                properties: {
                  status: {
                    type: "string",
                    enum: ["active", "inactive", "hidden"],
                  },
                  message: { type: "string", nullable: true },
                },
              },
              summary: {
                type: "object",
                additionalProperties: true,
                description: "Aggregated counts and scores",
              },
              hourly_buckets: {
                type: "array",
                description:
                  "24-element array (0–23h), each bucket visible or hidden per privacy rules",
              },
            },
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Manager JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
        Querystring: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const managerJwt = verifyManagerJwt(request.headers.authorization, options.jwtSecret);
        const { teamId } = DashboardDailyParamsSchema.parse(request.params);
        const { date } = DashboardDailyQuerySchema.parse(request.query ?? {});

        if (managerJwt.team_id !== teamId) {
          return reply.status(403).send({
            message: "Forbidden",
          });
        }

        const teamBelongsToWorkspace = await options.workspaceDirectory.hasTeamInWorkspace(
          managerJwt.workspace_id,
          teamId,
        );

        if (!teamBelongsToWorkspace) {
          return reply.status(403).send({
            message: "Forbidden",
          });
        }

        return reply.status(200).send(
          await dailyDashboardService.getDailyDashboard({
            teamId,
            date,
          }),
        );
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({ message: "Unauthorized" });
        }

        if (error instanceof MissingJwtSecretError) {
          return reply.status(500).send({ message: error.message });
        }

        if (error instanceof ZodError) {
          return reply.status(400).send({
            message: "Invalid dashboard daily request.",
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
        }

        throw error;
      }
    },
  );
}
