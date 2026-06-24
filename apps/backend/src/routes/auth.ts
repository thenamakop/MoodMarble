import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { adminCredentials, workspaces } from "../db/schema";
import type { DatabaseClient } from "../db/client";
import { createAdminJwt } from "../auth/admin-jwt";

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface AuthRouteOptions {
  jwtSecret?: string;
  databaseClient: DatabaseClient;
}

// Minimal in-memory rate limiting map for login
const loginRateLimitMap = new Map<
  string,
  { count: number; expiresAt: number }
>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function registerAuthRoutes(
  app: FastifyInstance,
  options: AuthRouteOptions,
): Promise<void> {
  const { jwtSecret, databaseClient } = options;

  app.post<{ Body: z.infer<typeof LoginRequestSchema> }>(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
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

      // To reduce timing attacks, we always compare hashes.
      // If the admin doesn't exist, we compare against a dummy hash.
      const dummyHash =
        "$2a$12$xG1QkL2Z3YxQkL2Z3YxQkO1QkL2Z3YxQkL2Z3YxQkL2Z3YxQkL2Z"; // A valid bcrypt hash structure
      const hashToCompare = admin?.passwordHash ?? dummyHash;

      const isValid = await bcrypt.compare(password, hashToCompare);

      if (!admin || !isValid || admin.active !== 1) {
        return reply.status(401).send({
          message: "Invalid email or password.",
        });
      }

      // On success, reset rate limit
      loginRateLimitMap.delete(ip);

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
}
