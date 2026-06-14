import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import {
  MissingJwtSecretError,
  WorkspaceJoinNotFoundError,
  WorkspaceJoinService,
} from "../services/workspace-join";
import type { WorkspaceDirectory } from "../services/workspace-directory";

interface RegisterWorkspaceJoinRouteOptions {
  jwtSecret?: string;
  workspaceDirectory: WorkspaceDirectory;
}

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
}
