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
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        return reply
          .status(200)
          .send(await workspaceJoinService.joinWorkspace(request.body));
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
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const deviceJwt = verifyDeviceJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const parsedPayload = TeamMembershipRequestSchema.parse(request.body);
        const teamBelongsToWorkspace =
          await options.workspaceDirectory.hasTeamInWorkspace(
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
