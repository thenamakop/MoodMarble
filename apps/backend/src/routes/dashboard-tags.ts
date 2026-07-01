import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, z } from "zod";

import { SubmissionDateSchema, TeamIdSchema } from "../../../../packages/shared";
import { MissingJwtSecretError, UnauthorizedError } from "../auth/device-jwt";
import { verifyManagerJwt } from "../auth/manager-jwt";
import { type DashboardAnalyticsSource } from "../services/dashboard-daily";
import { TagsDashboardService } from "../services/dashboard-tags";
import type { WorkspaceDirectory } from "../services/workspace-directory";

const DashboardTagsParamsSchema = z
  .object({
    teamId: TeamIdSchema,
  })
  .strict();

const DashboardTagsQuerySchema = z
  .object({
    start_date: SubmissionDateSchema.optional(),
  })
  .strict();

interface RegisterDashboardTagsRouteOptions {
  jwtSecret?: string;
  analyticsSource: DashboardAnalyticsSource;
  workspaceDirectory: WorkspaceDirectory;
  now?: () => Date;
}

/**
 * Registers the manager dashboard tag analytics route.
 *
 * @param app - The Fastify application instance.
 * @param options - Route configuration and service dependencies.
 */
export async function registerDashboardTagsRoute(
  app: FastifyInstance,
  options: RegisterDashboardTagsRouteOptions,
): Promise<void> {
  const tagsDashboardService = new TagsDashboardService({
    analyticsSource: options.analyticsSource,
    now: options.now,
  });

  app.get(
    "/dashboard/team/:teamId/tags",
    {
      schema: {
        tags: ["Manager"],
        summary: "Tag frequency analytics",
        security: [{ managerJwt: [] }],
        description:
          "Returns the count of each predefined tag submitted by " +
          "the team. Aggregated — no individual-level data. Privacy-enforced.",
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
              description: "YYYY-MM-DD. Defaults to today.",
            },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              team_id: { type: "string" },
              date: { type: "string" },
              alert_state: { type: "object", additionalProperties: true },
              summary: { type: "object", additionalProperties: true },
              tag_counts: {
                type: "array",
                description: "Array of { tag, count } objects sorted by frequency descending",
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
        const { teamId } = DashboardTagsParamsSchema.parse(request.params);
        const { start_date: startDate } = DashboardTagsQuerySchema.parse(request.query ?? {});

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
          await tagsDashboardService.getTagsDashboard({
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
            message: "Invalid dashboard tags request.",
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
