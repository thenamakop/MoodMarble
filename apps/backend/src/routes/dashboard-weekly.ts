import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, z } from "zod";

import { SubmissionDateSchema, TeamIdSchema } from "../../../../packages/shared";
import { MissingJwtSecretError, UnauthorizedError } from "../auth/device-jwt";
import { verifyManagerJwt } from "../auth/manager-jwt";
import { type DashboardAnalyticsSource } from "../services/dashboard-daily";
import { WeeklyDashboardService } from "../services/dashboard-weekly";
import type { WorkspaceDirectory } from "../services/workspace-directory";

const DashboardWeeklyParamsSchema = z
  .object({
    teamId: TeamIdSchema,
  })
  .strict();

const DashboardWeeklyQuerySchema = z
  .object({
    start_date: SubmissionDateSchema.optional(),
  })
  .strict();

interface RegisterDashboardWeeklyRouteOptions {
  jwtSecret?: string;
  analyticsSource: DashboardAnalyticsSource;
  workspaceDirectory: WorkspaceDirectory;
  now?: () => Date;
}

export async function registerDashboardWeeklyRoute(
  app: FastifyInstance,
  options: RegisterDashboardWeeklyRouteOptions,
): Promise<void> {
  const weeklyDashboardService = new WeeklyDashboardService({
    analyticsSource: options.analyticsSource,
    now: options.now,
  });

  app.get(
    "/dashboard/team/:teamId/weekly",
    {
      schema: {
        tags: ["Manager"],
        summary: "Weekly mood trend",
        security: [{ managerJwt: [] }],
        description:
          "Returns daily average mood scores over the past 7 days " +
          "for the team. Privacy-enforced per day.",
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
              description: "End date of the 7-day window (YYYY-MM-DD). Defaults to today.",
            },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              team_id: { type: "string" },
              week_end_date: { type: "string" },
              alert_state: { type: "object", additionalProperties: true },
              summary: { type: "object", additionalProperties: true },
              daily_points: {
                type: "array",
                description: "7 elements, one per day. Each may be visible or hidden.",
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
        const { teamId } = DashboardWeeklyParamsSchema.parse(request.params);
        const { start_date: startDate } = DashboardWeeklyQuerySchema.parse(request.query ?? {});

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
          await weeklyDashboardService.getWeeklyDashboard({
            teamId,
            startDate,
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
            message: "Invalid dashboard weekly request.",
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
