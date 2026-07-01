import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { TeamIdSchema } from "../../../../packages/shared";
import { z, ZodError } from "zod";

import {
  MissingJwtSecretError as MissingDeviceJwtSecretError,
  UnauthorizedError,
  verifyDeviceJwt,
} from "../auth/device-jwt";
import {
  MissingJwtSecretError,
  WorkspaceJoinNotFoundError,
  WorkspaceJoinService,
} from "../services/workspace-join";
import type { TeamMembershipStore } from "../services/team-members";
import type { WorkspaceDirectory } from "../services/workspace-directory";

interface RegisterWorkspaceJoinRouteOptions {
  jwtSecret?: string;
  teamMembershipStore: TeamMembershipStore;
  workspaceDirectory: WorkspaceDirectory;
}

const TeamMembershipRequestSchema = z
  .object({
    team_id: TeamIdSchema,
  })
  .strict();

/**
 * Registers the workspace join and team-member routes.
 *
 * Sets up the public workspace join endpoint and the device-authenticated team membership endpoint
 * using the provided services and configuration.
 *
 * @param app - The Fastify application instance.
 * @param options - Route dependencies and configuration.
 */
export async function registerWorkspaceJoinRoute(
  app: FastifyInstance,
  options: RegisterWorkspaceJoinRouteOptions,
): Promise<void> {
  const workspaceJoinService = new WorkspaceJoinService({
    jwtSecret: options.jwtSecret,
    workspaceDirectory: options.workspaceDirectory,
  });

  app.post(
    "/workspace/join",
    {
      schema: {
        tags: ["Public"],
        summary: "Join a workspace with an invite code",
        description:
          "Accepts a 6-character workspace join code and a " +
          "device-generated UUID. Returns a Device JWT that identifies " +
          "the anonymous device for future requests. The device token is " +
          "never stored in mood submissions.",
        body: {
          type: "object",
          additionalProperties: true,
          properties: {
            join_code: {
              type: "string",
              description: "6-character workspace join code",
            },
            device_token: {
              type: "string",
              description: "Client-generated UUID v4 — anonymous device identity",
            },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              workspace: {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                },
              },
              teams: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                  },
                },
              },
              device_jwt: {
                type: "string",
                description:
                  "Signed Device JWT — include as Bearer token in /mood and /workspace/team-member",
              },
            },
          },
          400: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid workspace join payload",
          },
          404: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Join code not found",
          },
          500: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Server configuration error",
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        return reply.status(200).send(await workspaceJoinService.joinWorkspace(request.body));
      } catch (error) {
        if (error instanceof WorkspaceJoinNotFoundError) {
          return reply.status(404).send({
            message: error.message,
          });
        }

        if (error instanceof MissingJwtSecretError) {
          return reply.status(500).send({
            message: error.message,
          });
        }

        if (error instanceof ZodError) {
          return reply.status(400).send({
            message: "Invalid workspace join payload.",
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

  app.post(
    "/workspace/team-member",
    {
      schema: {
        tags: ["Device"],
        summary: "Register device as a team member",
        security: [{ deviceJwt: [] }],
        description:
          "Associates the authenticated device with a specific team " +
          "within the workspace the device joined. Must be called after " +
          "POST /workspace/join before the device can submit moods.",
        body: {
          type: "object",
          additionalProperties: true,
          required: ["team_id"],
          properties: {
            team_id: {
              type: "string",
              description: "Team within the joined workspace",
            },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              status: { type: "string", enum: ["registered"] },
            },
          },
          400: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "team_id does not belong to the device's workspace",
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Device JWT",
          },
          500: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Server configuration error",
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const deviceJwt = verifyDeviceJwt(request.headers.authorization, options.jwtSecret);
        const parsedPayload = TeamMembershipRequestSchema.parse(request.body);
        const teamBelongsToWorkspace = await options.workspaceDirectory.hasTeamInWorkspace(
          deviceJwt.workspace_id,
          parsedPayload.team_id,
        );

        if (!teamBelongsToWorkspace) {
          return reply.status(400).send({
            message: "Invalid team selection payload.",
            issues: [
              {
                path: "team_id",
                message: "team_id must belong to the joined workspace.",
              },
            ],
          });
        }

        await options.teamMembershipStore.registerMember({
          teamId: parsedPayload.team_id,
          deviceToken: deviceJwt.device_token,
          role: "member",
        });

        return reply.status(200).send({
          status: "registered",
        });
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({
            message: "Unauthorized",
          });
        }

        if (error instanceof MissingDeviceJwtSecretError) {
          return reply.status(500).send({
            message: error.message,
          });
        }

        if (error instanceof ZodError) {
          return reply.status(400).send({
            message: "Invalid team selection payload.",
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
