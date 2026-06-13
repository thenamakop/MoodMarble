import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import {
  MoodSubmissionResponseSchema,
  MoodSubmissionSchema,
} from "../../../../packages/shared";
import {
  MissingJwtSecretError,
  UnauthorizedError,
  verifyDeviceJwt,
} from "../auth/device-jwt";
import {
  buildMoodSubmissionRecord,
  getSubmissionDate,
  type MoodSubmissionStore,
} from "../services/mood-submissions";
import {
  SubmissionRateLimitExceededError,
  type SubmissionRateLimiter,
} from "../services/submission-rate-limit";
import type { WorkspaceDirectory } from "../services/workspace-directory";

interface RegisterMoodRouteOptions {
  jwtSecret?: string;
  moodSubmissionStore: MoodSubmissionStore;
  workspaceDirectory: WorkspaceDirectory;
  submissionRateLimiter: SubmissionRateLimiter;
  now?: () => Date;
}

export async function registerMoodRoute(
  app: FastifyInstance,
  options: RegisterMoodRouteOptions,
): Promise<void> {
  app.post(
    "/mood",
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const deviceJwt = verifyDeviceJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const currentTime = options.now?.() ?? new Date();
        const parsedSubmission = MoodSubmissionSchema.parse(request.body);

        if (deviceJwt.workspace_id !== parsedSubmission.workspace_id) {
          return reply.status(400).send({
            message: "Invalid mood submission payload.",
            issues: [
              {
                path: "workspace_id",
                message:
                  "Submission workspace does not match the joined workspace.",
              },
            ],
          });
        }

        const teamBelongsToWorkspace =
          await options.workspaceDirectory.hasTeamInWorkspace(
            parsedSubmission.workspace_id,
            parsedSubmission.team_id,
          );

        if (!teamBelongsToWorkspace) {
          return reply.status(400).send({
            message: "Invalid mood submission payload.",
            issues: [
              {
                path: "team_id",
                message: "team_id must belong to the submitted workspace.",
              },
            ],
          });
        }

        const currentDate = getSubmissionDate(currentTime);
        const rateLimitResult = await options.submissionRateLimiter.consume(
          deviceJwt.device_token,
          currentDate,
        );

        if (!rateLimitResult.allowed) {
          throw new SubmissionRateLimitExceededError();
        }

        const storedSubmission = buildMoodSubmissionRecord(
          parsedSubmission,
          currentTime,
        );

        await options.moodSubmissionStore.createSubmission(storedSubmission);

        return reply.status(201).send(
          MoodSubmissionResponseSchema.parse({
            status: "received",
            marble_id: storedSubmission.id,
          }),
        );
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({ message: "Unauthorized" });
        }

        if (error instanceof MissingJwtSecretError) {
          return reply.status(500).send({ message: error.message });
        }

        if (error instanceof SubmissionRateLimitExceededError) {
          return reply.status(429).send({ message: error.message });
        }

        if (error instanceof ZodError) {
          return reply.status(400).send({
            message: "Invalid mood submission payload.",
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
