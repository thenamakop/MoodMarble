import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import {
  MoodSubmissionResponseSchema,
  MoodSubmissionSchema,
} from "../../../../packages/shared";
import { UnauthorizedError, verifyDeviceJwt } from "../auth/device-jwt";
import {
  buildMoodSubmissionRecord,
  getSubmissionDate,
  type MoodSubmissionStore,
} from "../services/mood-submissions";
import {
  SubmissionRateLimitExceededError,
  type SubmissionRateLimiter,
} from "../services/submission-rate-limit";

interface RegisterMoodRouteOptions {
  jwtSecret: string;
  moodSubmissionStore: MoodSubmissionStore;
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
