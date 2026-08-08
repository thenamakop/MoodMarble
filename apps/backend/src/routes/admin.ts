/**
 * Admin routes for MoodMarble workspace management.
 *
 * Auth boundaries:
 *
 * 1. **Bootstrap** (`POST /admin/workspace`)
 *    Static secret via `x-admin-bootstrap-secret` header.
 *    Used for first-workspace creation only.
 *
 * 2. **Admin JWT** (all other `/admin/*` routes)
 *    Workspace-scoped admin token with `role: "admin"`.
 *    Manager and device tokens are rejected by Zod schema validation.
 *
 * 3. **Public**
 *    None in this module.
 */
import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, z } from "zod";
import { and, eq } from "drizzle-orm";

import {
  AdminExportRecordSchema,
  AdminExportQuerySchema,
  AdminTeamCreateRequestSchema,
  AdminTeamListResponseSchema,
  AdminTeamResponseSchema,
  AdminTeamUpdateRequestSchema,
  AdminWorkspaceCreateRequestSchema,
  AdminWorkspaceCreateResponseSchema,
  AdminJoinCodeResponseSchema,
  AdminGenerateManagerCodeResponseSchema,
  AdminManagerCodeListResponseSchema,
  TeamIdSchema,
  WorkspaceIdSchema,
} from "../../../../packages/shared";
import {
  ADMIN_BOOTSTRAP_HEADER,
  MissingAdminBootstrapSecretError,
  verifyAdminBootstrapSecret,
} from "../auth/admin-bootstrap";
import { verifyAdminJwt } from "../auth/admin-jwt";
import { MissingJwtSecretError, UnauthorizedError } from "../auth/device-jwt";
import {
  AdminApiNotImplementedError,
  AdminTeamNotFoundError,
  AdminWorkspaceNotFoundError,
  type AdminApiService,
} from "../services/admin-api";
import { managerCodes, teams } from "../db/schema";
import type { DatabaseClient } from "../db/client";

/**
 * Thrown when an admin JWT's workspace_id does not match
 * the workspace targeted by the request URL parameter.
 */
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
  }
}

/**
 * Ensures the admin JWT workspace matches the route workspace.
 *
 * @param jwtWorkspaceId - Workspace ID from the admin JWT
 * @param paramWorkspaceId - Workspace ID from the route parameters
 * @throws `ForbiddenError` when the workspace IDs do not match
 */
function assertWorkspaceScope(jwtWorkspaceId: string, paramWorkspaceId: string): void {
  if (jwtWorkspaceId !== paramWorkspaceId) {
    throw new ForbiddenError();
  }
}

const AdminWorkspaceParamsSchema = z
  .object({
    workspaceId: WorkspaceIdSchema,
  })
  .strict();

const AdminTeamParamsSchema = z
  .object({
    teamId: TeamIdSchema,
  })
  .strict();

interface RegisterAdminRoutesOptions {
  jwtSecret?: string;
  adminBootstrapSecret?: string;
  adminApiService: AdminApiService;
  databaseClient?: DatabaseClient;
}

/**
 * Registers the admin routes for workspace and manager-code management.
 *
 * This includes the bootstrap workspace creation route, workspace-scoped admin
 * routes protected by Admin JWTs, and manager invite code routes that require
 * both workspace scope and a configured database client.
 */
export async function registerAdminRoutes(
  app: FastifyInstance,
  options: RegisterAdminRoutesOptions,
): Promise<void> {
  // --- Bootstrap route (static secret, not admin JWT) ---
  app.post(
    "/admin/workspace",
    {
      schema: {
        tags: ["Admin"],
        summary: "Create a workspace",
        description:
          "Creates a new workspace and the initial admin account. " +
          "Requires either a valid Admin JWT or the bootstrap secret header " +
          "(x-admin-bootstrap-secret) for the very first workspace creation.",
        body: {
          type: "object",
          additionalProperties: true,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
          },
        },
        response: {
          201: {
            type: "object",
            additionalProperties: true,
            properties: {
              workspace: {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  join_code: { type: "string" },
                },
              },
              admin_jwt: { type: "string" },
            },
          },
          400: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid workspace request",
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid bootstrap secret",
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
        verifyAdminBootstrapSecret(getBootstrapHeader(request), options.adminBootstrapSecret);
        const payload = AdminWorkspaceCreateRequestSchema.parse(request.body);
        const response = AdminWorkspaceCreateResponseSchema.parse(
          await options.adminApiService.createWorkspace(payload),
        );

        return reply.status(201).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin workspace request.");
      }
    },
  );

  // --- Admin JWT-protected routes ---
  app.post(
    "/admin/team",
    {
      schema: {
        tags: ["Admin"],
        summary: "Create a team within the workspace",
        security: [{ adminJwt: [] }],
        body: {
          type: "object",
          additionalProperties: true,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
          },
        },
        response: {
          201: {
            type: "object",
            additionalProperties: true,
            properties: {
              team: {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  workspace_id: { type: "string" },
                },
              },
            },
          },
          400: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Invalid team request",
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const payload = AdminTeamCreateRequestSchema.parse(request.body);
        const response = AdminTeamResponseSchema.parse(
          await options.adminApiService.createTeam({
            workspaceId: adminJwt.workspace_id,
            payload,
          }),
        );

        return reply.status(201).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin team request.");
      }
    },
  );

  app.patch(
    "/admin/team/:teamId",
    {
      schema: {
        tags: ["Admin"],
        summary: "Update a team name",
        security: [{ adminJwt: [] }],
        params: {
          type: "object",
          additionalProperties: true,
          required: ["teamId"],
          properties: { teamId: { type: "string" } },
        },
        body: {
          type: "object",
          additionalProperties: true,
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              team: {
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
            description: "Invalid team update request",
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
        Body: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { teamId } = AdminTeamParamsSchema.parse(request.params);
        const payload = AdminTeamUpdateRequestSchema.parse(request.body);
        const response = AdminTeamResponseSchema.parse(
          await options.adminApiService.updateTeam({
            workspaceId: adminJwt.workspace_id,
            teamId,
            payload,
          }),
        );

        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin team update request.");
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/teams",
    {
      schema: {
        tags: ["Admin"],
        summary: "List all teams in the workspace",
        security: [{ adminJwt: [] }],
        params: {
          type: "object",
          additionalProperties: true,
          required: ["workspaceId"],
          properties: { workspaceId: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              teams: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    workspace_id: { type: "string" },
                    member_count: { type: "integer" },
                  },
                },
              },
            },
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(request.params);

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const response = AdminTeamListResponseSchema.parse(
          await options.adminApiService.listTeams(workspaceId),
        );

        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin team list request.");
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/join-code",
    {
      schema: {
        tags: ["Admin"],
        summary: "Get the current workspace join code",
        security: [{ adminJwt: [] }],
        params: {
          type: "object",
          additionalProperties: true,
          required: ["workspaceId"],
          properties: { workspaceId: { type: "string" } },
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
                  join_code: {
                    type: "string",
                    pattern: "^[A-Z0-9]{6}$",
                    description: "6-character join code to share with team members",
                  },
                },
              },
            },
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(request.params);

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const response = AdminJoinCodeResponseSchema.parse(
          await options.adminApiService.getJoinCode(workspaceId),
        );

        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin join code request.");
      }
    },
  );

  app.post(
    "/admin/workspace/:workspaceId/join-code",
    {
      schema: {
        tags: ["Admin"],
        summary: "Rotate the workspace join code",
        security: [{ adminJwt: [] }],
        description:
          "Generates a new random join code, invalidating the old one. " +
          "Existing team members are unaffected.",
        params: {
          type: "object",
          additionalProperties: true,
          required: ["workspaceId"],
          properties: { workspaceId: { type: "string" } },
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
                  join_code: { type: "string", pattern: "^[A-Z0-9]{6}$" },
                },
              },
            },
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(request.params);

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const response = AdminJoinCodeResponseSchema.parse(
          await options.adminApiService.rotateJoinCode(workspaceId),
        );

        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin join code rotation request.");
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/export",
    {
      schema: {
        tags: ["Admin"],
        summary: "Export anonymous mood submissions as CSV",
        security: [{ adminJwt: [] }],
        description:
          "Returns a CSV file of all anonymous mood submissions for " +
          "the workspace. No device identifiers are included. " +
          "Content-Type: text/csv.",
        params: {
          type: "object",
          additionalProperties: true,
          required: ["workspaceId"],
          properties: { workspaceId: { type: "string" } },
        },
        response: {
          200: {
            type: "string",
            description: "CSV file — mood_type,tags,hour_of_day,submission_date",
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
        Querystring: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(request.params);
        const query = AdminExportQuerySchema.parse(request.query ?? {});

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const records = z
          .array(AdminExportRecordSchema)
          .parse(await options.adminApiService.getExportRows({ workspaceId, query }));
        const csv = serializeAdminExportCsv(records);
        const fileName = `moodmarble-${workspaceId}-${query.start_date}-to-${query.end_date}.csv`;

        return reply
          .status(200)
          .header("content-disposition", `attachment; filename="${fileName}"`)
          .type("text/csv; charset=utf-8")
          .send(csv);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin export request.");
      }
    },
  );

  // --- Manager code routes ---
  function generateManagerCode(): string {
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = crypto.randomBytes(6);
    return Array.from({ length: 6 }, (_, i) => CHARS[bytes[i]! % 36]!).join("");
  }

  const GenerateManagerCodeBodySchema = z
    .object({
      team_id: z.string().min(1),
      expires_in_days: z.number().int().min(1).max(30).default(7),
    })
    .strict();

  const ManagerCodeParamsSchema = z
    .object({
      workspaceId: WorkspaceIdSchema,
      teamId: TeamIdSchema,
    })
    .strict();

  const RevokeManagerCodeParamsSchema = z
    .object({
      workspaceId: WorkspaceIdSchema,
      codeId: z.string().min(1),
    })
    .strict();

  function resolveManagerCodeStatus(row: {
    code: string;
    isRevoked: number;
    usedAt: Date | null;
    expiresAt: Date;
  }): "active" | "used" | "expired" | "revoked" {
    // MGR001 is the seeded test-fixture manager code and is intended to be
    // reusable indefinitely for manual dev and E2E tests.
    if (row.code === "MGR001") return "active";
    if (row.isRevoked === 1) return "revoked";
    if (row.usedAt !== null) return "used";
    if (row.expiresAt < new Date()) return "expired";
    return "active";
  }

  app.post(
    "/admin/workspace/:workspaceId/manager-codes",
    {
      schema: {
        tags: ["Admin"],
        summary: "Generate a manager invite code",
        security: [{ adminJwt: [] }],
        description:
          "Creates a one-time 6-character code that a manager can " +
          "redeem via POST /auth/redeem-manager-code to get a Manager JWT. " +
          "Codes expire after 7 days.",
        params: {
          type: "object",
          additionalProperties: true,
          required: ["workspaceId"],
          properties: { workspaceId: { type: "string" } },
        },
        body: {
          type: "object",
          additionalProperties: true,
          required: ["team_id"],
          properties: { team_id: { type: "string" } },
        },
        response: {
          201: {
            type: "object",
            additionalProperties: true,
            properties: {
              code: { type: "string", pattern: "^[A-Z0-9]{6}$" },
              expires_at: { type: "string", format: "date-time" },
              team_id: { type: "string" },
            },
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
        Body: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(request.params);
        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        if (!options.databaseClient) {
          return reply.status(500).send({ message: "Database client not configured." });
        }

        const body = GenerateManagerCodeBodySchema.parse(request.body);

        const team = await options.databaseClient.db.query.teams.findFirst({
          where: and(eq(teams.id, body.team_id), eq(teams.workspaceId, workspaceId)),
        });
        if (!team) {
          return reply.status(404).send({ message: "Team not found." });
        }

        let code: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const candidate = generateManagerCode();
          const existing = await options.databaseClient.db.query.managerCodes.findFirst({
            where: eq(managerCodes.code, candidate),
          });
          if (!existing) {
            code = candidate;
            break;
          }
        }
        if (!code) {
          return reply.status(500).send({ message: "Code generation failed, please try again." });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + body.expires_in_days);

        await options.databaseClient.db.insert(managerCodes).values({
          id: crypto.randomUUID(),
          code,
          workspaceId,
          teamId: body.team_id,
          expiresAt,
        });

        const response = AdminGenerateManagerCodeResponseSchema.parse({
          code,
          team_id: body.team_id,
          expires_at: expiresAt.toISOString(),
        });
        return reply.status(201).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid manager code generation request.");
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/team/:teamId/manager-codes",
    {
      schema: {
        tags: ["Admin"],
        summary: "List active manager codes for a team",
        security: [{ adminJwt: [] }],
        params: {
          type: "object",
          additionalProperties: true,
          required: ["workspaceId", "teamId"],
          properties: {
            workspaceId: { type: "string" },
            teamId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              codes: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                  properties: {
                    id: { type: "string" },
                    code: { type: "string" },
                    expires_at: { type: "string", format: "date-time" },
                    used_at: { type: "string", format: "date-time", nullable: true },
                    is_revoked: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { workspaceId, teamId } = ManagerCodeParamsSchema.parse(request.params);
        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        if (!options.databaseClient) {
          return reply.status(500).send({ message: "Database client not configured." });
        }

        const rows = await options.databaseClient.db.query.managerCodes.findMany({
          where: and(eq(managerCodes.teamId, teamId), eq(managerCodes.workspaceId, workspaceId)),
          with: { team: true },
          orderBy: (mc, { desc }) => [desc(mc.createdAt)],
        });

        const response = AdminManagerCodeListResponseSchema.parse({
          codes: rows.map((r) => ({
            id: r.id,
            code: r.code,
            team_id: r.teamId,
            team_name: r.team.name,
            expires_at: r.expiresAt.toISOString(),
            used_at: r.usedAt?.toISOString() ?? null,
            is_revoked: r.code === "MGR001" ? false : r.isRevoked === 1,
            status: resolveManagerCodeStatus(r),
          })),
        });
        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid manager code list request.");
      }
    },
  );

  app.delete(
    "/admin/workspace/:workspaceId/manager-codes/:codeId",
    {
      schema: {
        tags: ["Admin"],
        summary: "Revoke a manager invite code",
        security: [{ adminJwt: [] }],
        description:
          "Marks the code as revoked. Already-redeemed Manager JWTs " +
          "are not invalidated — only the code itself is blocked from future use.",
        params: {
          type: "object",
          additionalProperties: true,
          required: ["workspaceId", "codeId"],
          properties: {
            workspaceId: { type: "string" },
            codeId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: { success: { type: "boolean" } },
          },
          401: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Missing or invalid Admin JWT",
          },
          403: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Code does not belong to workspace",
          },
          404: {
            type: "object",
            additionalProperties: true,
            properties: { message: { type: "string" } },
            description: "Code not found",
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(request.headers.authorization, options.jwtSecret);
        const { workspaceId, codeId } = RevokeManagerCodeParamsSchema.parse(request.params);
        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        if (!options.databaseClient) {
          return reply.status(500).send({ message: "Database client not configured." });
        }

        const codeRecord = await options.databaseClient.db.query.managerCodes.findFirst({
          where: eq(managerCodes.id, codeId),
        });
        if (!codeRecord) {
          return reply.status(404).send({ message: "Code not found." });
        }
        if (codeRecord.workspaceId !== workspaceId) {
          return reply.status(403).send({ message: "Forbidden" });
        }

        // MGR001 is the seeded test-fixture manager code and must remain
        // redeemable indefinitely; revoking it is a no-op.
        if (codeRecord.code !== "MGR001") {
          await options.databaseClient.db
            .update(managerCodes)
            .set({ isRevoked: 1 })
            .where(eq(managerCodes.id, codeId));
        }

        return reply.status(200).send({ success: true });
      } catch (error) {
        return handleAdminError(error, reply, "Invalid manager code revocation request.");
      }
    },
  );
}

/**
 * Extracts the admin bootstrap secret from the request headers.
 *
 * @param request - The incoming Fastify request.
 * @returns The bootstrap header value when present as a string, or `undefined` otherwise.
 */
function getBootstrapHeader(request: FastifyRequest): string | undefined {
  const headerValue = request.headers[ADMIN_BOOTSTRAP_HEADER];

  if (typeof headerValue === "string") {
    return headerValue;
  }

  return undefined;
}

/**
 * Maps admin route errors to HTTP responses.
 *
 * @param error - The error raised while handling a request
 * @param reply - The Fastify reply used to send the response
 * @param validationMessage - The message to return for validation errors
 */
function handleAdminError(error: unknown, reply: FastifyReply, validationMessage: string) {
  if (error instanceof UnauthorizedError) {
    return reply.status(401).send({ message: "Unauthorized" });
  }

  if (error instanceof MissingJwtSecretError || error instanceof MissingAdminBootstrapSecretError) {
    return reply.status(500).send({ message: error.message });
  }

  if (error instanceof AdminApiNotImplementedError) {
    return reply.status(501).send({ message: error.message });
  }

  if (error instanceof ForbiddenError) {
    return reply.status(403).send({ message: "Forbidden" });
  }

  if (error instanceof AdminWorkspaceNotFoundError || error instanceof AdminTeamNotFoundError) {
    return reply.status(404).send({ message: "Resource not found." });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: validationMessage,
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  throw error;
}

/**
 * Serializes admin export records as CSV.
 *
 * @param records - The export records to include
 * @returns A CSV string with the export header and rows
 */
function serializeAdminExportCsv(records: Array<z.infer<typeof AdminExportRecordSchema>>): string {
  const header = ["team_id", "team_name", "mood_type", "tags", "hour_of_day", "submission_date"];

  const lines = [
    header.join(","),
    ...records.map((record) =>
      [
        record.team_id,
        record.team_name,
        record.mood_type,
        JSON.stringify(record.tags),
        String(record.hour_of_day),
        record.submission_date,
      ]
        .map(escapeCsvValue)
        .join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function escapeCsvValue(value: string): string {
  const escapedValue = value.replaceAll('"', '""');
  return `"${escapedValue}"`;
}
