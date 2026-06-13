import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import {
  WorkspaceJoinRequestSchema,
  WorkspaceJoinResponseSchema,
} from "../../../../packages/shared";
import { createDeviceJwt, MissingJwtSecretError } from "../auth/device-jwt";
import type { WorkspaceDirectory } from "../services/workspace-directory";

interface RegisterWorkspaceJoinRouteOptions {
  jwtSecret?: string;
  workspaceDirectory: WorkspaceDirectory;
}

export async function registerWorkspaceJoinRoute(
  app: FastifyInstance,
  options: RegisterWorkspaceJoinRouteOptions,
): Promise<void> {
  app.post(
    "/workspace/join",
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const payload = WorkspaceJoinRequestSchema.parse(request.body);
        const workspace = await options.workspaceDirectory.findByJoinCode(
          payload.join_code,
        );

        if (!workspace) {
          return reply.status(404).send({
            message: "Join code not found.",
          });
        }

        const { deviceJwt, deviceToken } = createDeviceJwt(options.jwtSecret);

        return reply.status(200).send(
          WorkspaceJoinResponseSchema.parse({
            workspace: {
              id: workspace.id,
              name: workspace.name,
            },
            teams: workspace.teams,
            device_jwt: deviceJwt,
            device_token: deviceToken,
          }),
        );
      } catch (error) {
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
}
