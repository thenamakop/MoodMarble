import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { MoodSubmissionResponseSchema, MoodSubmissionSchema } from "../../../../packages/shared";
import { MissingJwtSecretError, UnauthorizedError, verifyDeviceJwt } from "../auth/device-jwt";
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
    {
      schema: {
        tags: ["Device"],
        summary: "Submit a mood marble",
        security: [{ deviceJwt: [] }],
        description:
          "Records an anonymous mood submission for the device's " +
          "team. The device token is extracted from the JWT for rate-limiting " +
          "only and is never stored alongside the mood record. " +
          "Limited to 5 submissions per device per day.",
        body: {
          type: "object",
          additionalProperties: true,
          properties: {
            workspace_id: { type: "string" },
            team_id: { type: "string" },
            mood_type: {
              type: "string",
              enum: [
                "energised",
                "happy",
                "calm",
                "focused",
                "neutral",
                "tired",
                "stressed",
                "sad",
                "unheard",
              ],
            },
            tags: {
              type: "array",
              items: { type: "string" },
              maxItems: 2,
              description: "Up to 2 predefined tags",
            },
            note: {
              type: "string",
              maxLength: 120,
              description:
                "Optional free-text note. Stored as SHA-256 hash only — never as raw text.",
              nullable: true,
            },
            hour_of_day: {
              type: "integer",
              minimum: 0,
              maximum: 23,
              description: "Hour of submission in 24h format (privacy: exact time never stored)",
            },
            submission_date: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "YYYY-MM-DD format",
            },
          },
        },
        response: {
          201: {
            type: "object",
            additionalProperties: true,
            properties: {
              status: { type: "string", enum: ["received"] },
              marble_id: { type: "string" },
            },
          },
          400: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid mood submission payload",
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Device JWT",
          },
          429: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Daily submission limit (5/day) reached",
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
        const currentTime = options.now?.() ?? new Date();
        const parsedSubmission = MoodSubmissionSchema.parse(request.body);
        if (deviceJwt.workspace_id !== parsedSubmission.workspace_id) {
          return reply.status(400).send({
            message: "Invalid mood submission payload.",
            issues: [
              {
                path: "workspace_id",
                message: "Submission workspace does not match the joined workspace.",
              },
            ],
          });
        }

        const teamBelongsToWorkspace = await options.workspaceDirectory.hasTeamInWorkspace(
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

        const currentDate = getSubmissionDate(parsedSubmission);
        const rateLimitResult = await options.submissionRateLimiter.consume(
          deviceJwt.device_token,
          currentDate,
        );

        if (!rateLimitResult.allowed) {
          throw new SubmissionRateLimitExceededError();
        }

        const storedSubmission = buildMoodSubmissionRecord(parsedSubmission);

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
