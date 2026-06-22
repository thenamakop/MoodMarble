import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, z } from "zod";

import {
  AdminExportRecordSchema,
  AdminExportQuerySchema,
  AdminTeamCreateRequestSchema,
  AdminTeamResponseSchema,
  AdminTeamUpdateRequestSchema,
  AdminWorkspaceCreateRequestSchema,
  AdminWorkspaceCreateResponseSchema,
  AdminJoinCodeResponseSchema,
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
  type AdminApiService,
} from "../services/admin-api";

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
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  options: RegisterAdminRoutesOptions,
): Promise<void> {
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

        if (adminJwt.workspace_id !== workspaceId) {
          return reply.status(403).send({
            message: "Forbidden",
          });
        }

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

        if (adminJwt.workspace_id !== workspaceId) {
          return reply.status(403).send({
            message: "Forbidden",
          });
        }

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

        if (adminJwt.workspace_id !== workspaceId) {
          return reply.status(403).send({
            message: "Forbidden",
          });
        }

        const records = z
          .array(AdminExportRecordSchema)
          .parse(
            await options.adminApiService.getExportRows({ workspaceId, query }),
          );
        const csv = serializeAdminExportCsv(records);

        return reply.status(200).type("text/csv; charset=utf-8").send(csv);
      } catch (error) {
        return handleAdminError(error, reply, "Invalid admin export request.");
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
