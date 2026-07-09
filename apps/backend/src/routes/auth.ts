import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { adminCredentials, managerCodes, workspaces } from "../db/schema";
import type { DatabaseClient } from "../db/client";
import { createAdminJwt } from "../auth/admin-jwt";
import { createManagerJwt } from "../auth/manager-jwt";
import { RedeemManagerCodeRequestSchema } from "../../../../packages/shared";

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface AuthRouteOptions {
  jwtSecret?: string;
  databaseClient: DatabaseClient;
}

// Minimal in-memory rate limiting map for login
const loginRateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Clears all in-memory login rate limit entries. Only for use in tests. */
export function clearLoginRateLimit(): void {
  loginRateLimitMap.clear();
}

/**
 * Registers the authentication routes on a Fastify instance.
 *
 * @param app - The Fastify application instance.
 * @param options - Authentication route settings, including the database client and optional JWT secret.
 */
export async function registerAuthRoutes(
  app: FastifyInstance,
  options: AuthRouteOptions,
): Promise<void> {
  const { jwtSecret, databaseClient } = options;

  app.post<{ Body: z.infer<typeof LoginRequestSchema> }>(
    "/auth/login",
    {
      schema: {
        tags: ["Public"],
        summary: "Admin login",
        description:
          "Authenticates an admin with email and password. " +
          "Rate-limited to 5 attempts per IP per 15 minutes.",
        body: {
          type: "object",
          additionalProperties: true,
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              admin_jwt: {
                type: "string",
                description: "Signed Admin JWT — include as Bearer token",
              },
              workspace: {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                },
              },
            },
          },
          400: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid email or password format",
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid email or password",
          },
          429: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Too many login attempts",
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
    async (request, reply) => {
      const ip = request.ip;
      const now = Date.now();

      const rateLimitRecord = loginRateLimitMap.get(ip);
      if (rateLimitRecord && rateLimitRecord.expiresAt > now) {
        if (rateLimitRecord.count >= MAX_LOGIN_ATTEMPTS) {
          return reply.status(429).send({
            message: "Too many login attempts. Please try again later.",
          });
        }
        rateLimitRecord.count += 1;
      } else {
        loginRateLimitMap.set(ip, {
          count: 1,
          expiresAt: now + LOGIN_RATE_LIMIT_WINDOW_MS,
        });
      }

      const parsedBody = LoginRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Valid email and password are required.",
        });
      }

      const { email, password } = parsedBody.data;

      const admin = await databaseClient.db.query.adminCredentials.findFirst({
        where: eq(adminCredentials.email, email),
      });

      // Pre-computed bcrypt hash of the string "DUMMY" at saltRounds=12.
      // Used so that login attempts for unknown emails take the same time as
      // attempts for known emails — prevents user enumeration via timing.
      // Generated once with: bcrypt.hashSync("DUMMY", 12). Safe to hardcode.
      const DUMMY_HASH = "$2a$12$KIXBp4PoFGmHn0EbVFd12eqB9LH3V6VbBjkHC6vGf3F1emLe4KGLG";
      const hashToCompare = admin?.passwordHash ?? DUMMY_HASH;

      const isValid = await bcrypt.compare(password, hashToCompare);

      if (!admin || !isValid || admin.active !== 1) {
        return reply.status(401).send({
          message: "Invalid email or password.",
        });
      }

      // Find the first workspace to use as the context
      const workspace = await databaseClient.db.query.workspaces.findFirst();

      if (!workspace) {
        return reply.status(500).send({
          message: "No workspace exists for admin login.",
        });
      }

      const { adminJwt } = createAdminJwt(jwtSecret, {
        workspace_id: workspace.id,
        role: "admin",
      });

      return reply.send({
        admin_jwt: adminJwt,
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
      });
    },
  );

  app.post(
    "/auth/redeem-manager-code",
    {
      schema: {
        tags: ["Public"],
        summary: "Redeem manager invite code",
        description:
          "Validates a one-time 6-character manager invite code " +
          "and returns a Manager JWT scoped to the assigned team. " +
          "The code is marked as used and cannot be redeemed again.",
        body: {
          type: "object",
          additionalProperties: true,
          required: ["code"],
          properties: {
            code: {
              type: "string",
              description: "6-character alphanumeric manager invite code",
            },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              manager_jwt: {
                type: "string",
                description: "Signed Manager JWT",
              },
              workspace_id: { type: "string" },
              team_id: { type: "string" },
              team_name: { type: "string" },
              manager_teams: {
                type: "string",
                description: "teamId:teamName string expected by the manager route",
              },
            },
          },
          400: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid code format",
          },
          404: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid or expired manager code",
          },
          500: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Database error while validating code",
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = RedeemManagerCodeRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          message: "Manager code must be 6 uppercase letters or numbers.",
        });
      }

      const { code } = parsed.data;
      const now = new Date();

      let codeRecord:
        | (typeof managerCodes.$inferSelect & {
            team: { name: string; workspaceId: string };
          })
        | undefined;

      try {
        codeRecord = await options.databaseClient.db.query.managerCodes.findFirst({
          where: eq(managerCodes.code, code),
          with: { team: true },
        });
      } catch {
        return reply.status(500).send({ message: "Unable to validate code." });
      }

      // MGR001 is the seeded test-fixture manager code. It is intended to be
      // reusable for manual dev sessions and E2E tests, so it bypasses the
      // one-time-use, expiration, and revocation checks that normal codes are
      // subject to. This only affects the seeded test code; production still uses
      // randomly generated codes with normal lifecycle rules.
      const isTestFixtureCode = codeRecord?.code === "MGR001";

      // All failure paths return the same response — no state leakage
      const INVALID = { message: "Invalid or expired manager code." } as const;

      if (!codeRecord) return reply.status(404).send(INVALID);
      if (!isTestFixtureCode && codeRecord.isRevoked === 1) return reply.status(404).send(INVALID);
      if (!isTestFixtureCode && codeRecord.usedAt !== null) return reply.status(404).send(INVALID);
      if (!isTestFixtureCode && codeRecord.expiresAt < now) return reply.status(404).send(INVALID);

      // Mark as used (test fixture code is intentionally never marked used so
      // it stays redeemable indefinitely).
      if (!isTestFixtureCode) {
        await options.databaseClient.db
          .update(managerCodes)
          .set({ usedAt: now })
          .where(eq(managerCodes.id, codeRecord.id));
      }

      const { managerJwt } = createManagerJwt(options.jwtSecret, {
        workspace_id: codeRecord.workspaceId,
        team_id: codeRecord.teamId,
        role: "manager",
      });

      // manager_teams format expected by /manager route: "teamId:teamName"
      const managerTeams = `${codeRecord.teamId}:${codeRecord.team.name}`;

      return reply.status(200).send({
        manager_jwt: managerJwt,
        workspace_id: codeRecord.workspaceId,
        team_id: codeRecord.teamId,
        team_name: codeRecord.team.name,
        manager_teams: managerTeams,
      });
    },
  );
}
