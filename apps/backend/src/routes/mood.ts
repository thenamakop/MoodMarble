import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import {
  MoodSubmissionResponseSchema,
  MoodSubmissionSchema,
} from "../../../../packages/shared";
import { UnauthorizedError, verifyDeviceJwt } from "../auth/device-jwt";
import {
  buildMoodSubmissionRecord,
  type MoodSubmissionStore,
} from "../services/mood-submissions";

interface RegisterMoodRouteOptions {
  jwtSecret: string;
  moodSubmissionStore: MoodSubmissionStore;
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
        verifyDeviceJwt(request.headers.authorization, options.jwtSecret);

        const parsedSubmission = MoodSubmissionSchema.parse(request.body);
        const storedSubmission = buildMoodSubmissionRecord(
          parsedSubmission,
          options.now?.() ?? new Date(),
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
