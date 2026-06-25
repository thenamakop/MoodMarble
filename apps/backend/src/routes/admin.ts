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
 * Asserts that the admin JWT's workspace scope matches the
 * workspace referenced in the route params. Throws ForbiddenError
 * on mismatch so the caller never forgets the check.
 */
function assertWorkspaceScope(
  jwtWorkspaceId: string,
  paramWorkspaceId: string,
): void {
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

export async function registerAdminRoutes(
  app: FastifyInstance,
  options: RegisterAdminRoutesOptions,
): Promise<void> {
  // --- Bootstrap route (static secret, not admin JWT) ---
  app.post(
    "/admin/workspace",
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        verifyAdminBootstrapSecret(
          getBootstrapHeader(request),
          options.adminBootstrapSecret,
        );
        const payload = AdminWorkspaceCreateRequestSchema.parse(request.body);
        const response = AdminWorkspaceCreateResponseSchema.parse(
          await options.adminApiService.createWorkspace(payload),
        );

        return reply.status(201).send(response);
      } catch (error) {
        return handleAdminError(
          error,
          reply,
          "Invalid admin workspace request.",
        );
      }
    },
  );

  // --- Admin JWT-protected routes ---
  app.post(
    "/admin/team",
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
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
    async (
      request: FastifyRequest<{
        Params: unknown;
        Body: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
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
        return handleAdminError(
          error,
          reply,
          "Invalid admin team update request.",
        );
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/teams",
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(
          request.params,
        );

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const response = AdminTeamListResponseSchema.parse(
          await options.adminApiService.listTeams(workspaceId),
        );

        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(
          error,
          reply,
          "Invalid admin team list request.",
        );
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/join-code",
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(
          request.params,
        );

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const response = AdminJoinCodeResponseSchema.parse(
          await options.adminApiService.getJoinCode(workspaceId),
        );

        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(
          error,
          reply,
          "Invalid admin join code request.",
        );
      }
    },
  );

  app.post(
    "/admin/workspace/:workspaceId/join-code",
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(
          request.params,
        );

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const response = AdminJoinCodeResponseSchema.parse(
          await options.adminApiService.rotateJoinCode(workspaceId),
        );

        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(
          error,
          reply,
          "Invalid admin join code rotation request.",
        );
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/export",
    async (
      request: FastifyRequest<{
        Params: unknown;
        Querystring: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(
          request.params,
        );
        const query = AdminExportQuerySchema.parse(request.query ?? {});

        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const records = z
          .array(AdminExportRecordSchema)
          .parse(
            await options.adminApiService.getExportRows({ workspaceId, query }),
          );
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
    isRevoked: number;
    usedAt: Date | null;
    expiresAt: Date;
  }): "active" | "used" | "expired" | "revoked" {
    if (row.isRevoked === 1) return "revoked";
    if (row.usedAt !== null) return "used";
    if (row.expiresAt < new Date()) return "expired";
    return "active";
  }

  app.post(
    "/admin/workspace/:workspaceId/manager-codes",
    async (
      request: FastifyRequest<{
        Params: unknown;
        Body: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const { workspaceId } = AdminWorkspaceParamsSchema.parse(
          request.params,
        );
        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const body = GenerateManagerCodeBodySchema.parse(request.body);

        const team = await options.databaseClient.db.query.teams.findFirst({
          where: and(
            eq(teams.id, body.team_id),
            eq(teams.workspaceId, workspaceId),
          ),
        });
        if (!team) {
          return reply.status(404).send({ message: "Team not found." });
        }

        let code: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const candidate = generateManagerCode();
          const existing =
            await options.databaseClient.db.query.managerCodes.findFirst({
              where: eq(managerCodes.code, candidate),
            });
          if (!existing) {
            code = candidate;
            break;
          }
        }
        if (!code) {
          return reply
            .status(500)
            .send({ message: "Code generation failed, please try again." });
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
        return handleAdminError(
          error,
          reply,
          "Invalid manager code generation request.",
        );
      }
    },
  );

  app.get(
    "/admin/workspace/:workspaceId/team/:teamId/manager-codes",
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const { workspaceId, teamId } = ManagerCodeParamsSchema.parse(
          request.params,
        );
        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const rows =
          await options.databaseClient.db.query.managerCodes.findMany({
            where: and(
              eq(managerCodes.teamId, teamId),
              eq(managerCodes.workspaceId, workspaceId),
            ),
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
            is_revoked: r.isRevoked === 1,
            status: resolveManagerCodeStatus(r),
          })),
        });
        return reply.status(200).send(response);
      } catch (error) {
        return handleAdminError(
          error,
          reply,
          "Invalid manager code list request.",
        );
      }
    },
  );

  app.delete(
    "/admin/workspace/:workspaceId/manager-codes/:codeId",
    async (
      request: FastifyRequest<{
        Params: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const adminJwt = verifyAdminJwt(
          request.headers.authorization,
          options.jwtSecret,
        );
        const { workspaceId, codeId } = RevokeManagerCodeParamsSchema.parse(
          request.params,
        );
        assertWorkspaceScope(adminJwt.workspace_id, workspaceId);

        const codeRecord =
          await options.databaseClient.db.query.managerCodes.findFirst({
            where: eq(managerCodes.id, codeId),
          });
        if (!codeRecord) {
          return reply.status(404).send({ message: "Code not found." });
        }
        if (codeRecord.workspaceId !== workspaceId) {
          return reply.status(403).send({ message: "Forbidden" });
        }

        await options.databaseClient.db
          .update(managerCodes)
          .set({ isRevoked: 1 })
          .where(eq(managerCodes.id, codeId));

        return reply.status(200).send({ success: true });
      } catch (error) {
        return handleAdminError(error, reply, "Invalid manager code revocation request.");
      }
    },
  );
}

function getBootstrapHeader(request: FastifyRequest): string | undefined {
  const headerValue = request.headers[ADMIN_BOOTSTRAP_HEADER];

  if (typeof headerValue === "string") {
    return headerValue;
  }

  return undefined;
}

function handleAdminError(
  error: unknown,
  reply: FastifyReply,
  validationMessage: string,
) {
  if (error instanceof UnauthorizedError) {
    return reply.status(401).send({ message: "Unauthorized" });
  }

  if (
    error instanceof MissingJwtSecretError ||
    error instanceof MissingAdminBootstrapSecretError
  ) {
    return reply.status(500).send({ message: error.message });
  }

  if (error instanceof AdminApiNotImplementedError) {
    return reply.status(501).send({ message: error.message });
  }

  if (error instanceof ForbiddenError) {
    return reply.status(403).send({ message: "Forbidden" });
  }

  if (
    error instanceof AdminWorkspaceNotFoundError ||
    error instanceof AdminTeamNotFoundError
  ) {
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

function serializeAdminExportCsv(
  records: Array<z.infer<typeof AdminExportRecordSchema>>,
): string {
  const header = [
    "team_id",
    "team_name",
    "mood_type",
    "tags",
    "note_hash",
    "hour_of_day",
    "submission_date",
  ];

  const lines = [
    header.join(","),
    ...records.map((record) =>
      [
        record.team_id,
        record.team_name,
        record.mood_type,
        JSON.stringify(record.tags),
        record.note_hash ?? "",
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
