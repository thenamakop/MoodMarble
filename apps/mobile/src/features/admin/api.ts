import {
  AdminJoinCodeResponseSchema,
  AdminTeamCreateRequestSchema,
  AdminTeamListResponseSchema,
  AdminTeamResponseSchema,
  AdminTeamUpdateRequestSchema,
  AdminWorkspaceCreateRequestSchema,
  AdminWorkspaceCreateResponseSchema,
  type AdminTeam,
  type AdminWorkspaceCreateResponse,
} from "@/contracts/admin";
import { createApiUrl, getApiRequestErrorMessage } from "@/lib/api";

const ADMIN_PANEL_ERROR_MESSAGE = "Unable to load the admin control panel right now.";
const ADMIN_ACCESS_MISSING_MESSAGE =
  "Admin access missing. Open the admin panel from a valid admin link again.";
const ADMIN_WORKSPACE_CREATE_ERROR_MESSAGE = "Unable to create workspace right now.";
const ADMIN_TEAM_CREATE_ERROR_MESSAGE = "Unable to add team right now.";
const ADMIN_TEAM_UPDATE_ERROR_MESSAGE = "Unable to update team right now.";
const ADMIN_JOIN_CODE_ERROR_MESSAGE = "Unable to load join code right now.";
const ADMIN_JOIN_CODE_ROTATE_ERROR_MESSAGE = "Unable to refresh join code right now.";
const ADMIN_EXPORT_ERROR_MESSAGE = "Unable to export CSV right now.";
const ADMIN_LOGIN_ERROR_MESSAGE = "Unable to login right now.";
const SAFE_ADMIN_ERROR_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden",
  "Join code not found.",
  "Workspace not found.",
  "Team not found.",
  "Invalid email or password.",
  ADMIN_ACCESS_MISSING_MESSAGE,
]);
const ADMIN_BOOTSTRAP_HEADER = "x-admin-bootstrap-secret";

interface LoadAdminPanelShellInput {
  adminJwt: string;
  workspaceId: string;
  workspaceName: string | null;
}

interface CreateAdminWorkspaceInput {
  bootstrapSecret: string;
  name: string;
}

interface AdminWorkspaceSession {
  adminJwt: string;
  workspaceId: string;
}

interface AdminLoginResponse {
  admin_jwt: string;
  workspace: {
    id: string;
    name: string;
  };
}

export async function loginAdmin(input: {
  email: string;
  password: string;
}): Promise<AdminLoginResponse> {
  const response = await fetch(createApiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMsg = ADMIN_LOGIN_ERROR_MESSAGE;
    try {
      const data = await response.json();
      if (data.message && SAFE_ADMIN_ERROR_MESSAGES.has(data.message)) {
        errorMsg = data.message;
      } else if (response.status === 429) {
        errorMsg = "Too many login attempts. Please try again later.";
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<AdminLoginResponse>;
}

interface CreateAdminTeamInput extends AdminWorkspaceSession {
  name: string;
}

interface UpdateAdminTeamInput extends AdminWorkspaceSession {
  teamId: string;
  name: string;
}

interface ExportAdminCsvInput extends AdminWorkspaceSession {
  startDate: string;
  endDate: string;
}

interface AdminExportResult {
  csv: string;
  fileName: string;
}

interface AdminPanelShellBundle {
  workspaceId: string;
  workspaceName: string | null;
  joinCode: string | null;
  teams: AdminTeam[];
}

export async function loadAdminPanelShell(
  input: LoadAdminPanelShellInput,
): Promise<AdminPanelShellBundle | null> {
  if (!input.adminJwt.trim() || !input.workspaceId.trim()) {
    throw new Error(ADMIN_ACCESS_MISSING_MESSAGE);
  }

  const [teamsResponse, joinCodeResponse] = await Promise.all([
    requestJson({
      authorization: input.adminJwt,
      requestUrl: createApiUrl(`/admin/workspace/${input.workspaceId}/teams`),
      responseSchema: AdminTeamListResponseSchema,
      stableMessage: ADMIN_PANEL_ERROR_MESSAGE,
    }),
    requestJson({
      authorization: input.adminJwt,
      requestUrl: createApiUrl(`/admin/workspace/${input.workspaceId}/join-code`),
      responseSchema: AdminJoinCodeResponseSchema,
      stableMessage: ADMIN_PANEL_ERROR_MESSAGE,
    }),
  ]);

  const normalizedWorkspaceName = normalizeOptionalText(input.workspaceName);

  if (
    !normalizedWorkspaceName &&
    !joinCodeResponse.workspace.join_code &&
    teamsResponse.teams.length === 0
  ) {
    return null;
  }

  return {
    workspaceId: input.workspaceId,
    workspaceName: normalizedWorkspaceName,
    joinCode: joinCodeResponse.workspace.join_code,
    teams: teamsResponse.teams,
  };
}

export async function createAdminWorkspace(
  input: CreateAdminWorkspaceInput,
): Promise<AdminWorkspaceCreateResponse> {
  return requestJson({
    body: AdminWorkspaceCreateRequestSchema.parse({
      name: input.name,
    }),
    headers: {
      [ADMIN_BOOTSTRAP_HEADER]: input.bootstrapSecret.trim(),
    },
    requestUrl: createApiUrl("/admin/workspace"),
    responseSchema: AdminWorkspaceCreateResponseSchema,
    stableMessage: ADMIN_WORKSPACE_CREATE_ERROR_MESSAGE,
    method: "POST",
  });
}

export async function createAdminTeam(input: CreateAdminTeamInput): Promise<AdminTeam> {
  const response = await requestJson({
    authorization: input.adminJwt,
    body: AdminTeamCreateRequestSchema.parse({
      name: input.name,
    }),
    requestUrl: createApiUrl("/admin/team"),
    responseSchema: AdminTeamResponseSchema,
    stableMessage: ADMIN_TEAM_CREATE_ERROR_MESSAGE,
    method: "POST",
  });

  return response.team;
}

export async function updateAdminTeam(input: UpdateAdminTeamInput): Promise<AdminTeam> {
  const response = await requestJson({
    authorization: input.adminJwt,
    body: AdminTeamUpdateRequestSchema.parse({
      name: input.name,
    }),
    requestUrl: createApiUrl(`/admin/team/${input.teamId}`),
    responseSchema: AdminTeamResponseSchema,
    stableMessage: ADMIN_TEAM_UPDATE_ERROR_MESSAGE,
    method: "PATCH",
  });

  return response.team;
}

export async function fetchAdminJoinCode(input: AdminWorkspaceSession): Promise<string> {
  const response = await requestJson({
    authorization: input.adminJwt,
    requestUrl: createApiUrl(`/admin/workspace/${input.workspaceId}/join-code`),
    responseSchema: AdminJoinCodeResponseSchema,
    stableMessage: ADMIN_JOIN_CODE_ERROR_MESSAGE,
  });

  return response.workspace.join_code;
}

export async function rotateAdminJoinCode(input: AdminWorkspaceSession): Promise<string> {
  const response = await requestJson({
    authorization: input.adminJwt,
    requestUrl: createApiUrl(`/admin/workspace/${input.workspaceId}/join-code`),
    responseSchema: AdminJoinCodeResponseSchema,
    stableMessage: ADMIN_JOIN_CODE_ROTATE_ERROR_MESSAGE,
    method: "POST",
  });

  return response.workspace.join_code;
}

export async function exportAdminCsv(input: ExportAdminCsvInput): Promise<AdminExportResult> {
  const query = new URLSearchParams({
    start_date: input.startDate,
    end_date: input.endDate,
  });
  const requestUrl = createApiUrl(
    `/admin/workspace/${input.workspaceId}/export?${query.toString()}`,
  );
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.adminJwt}`,
      },
    });
  } catch (error: unknown) {
    throw new Error(getApiRequestErrorMessage(ADMIN_EXPORT_ERROR_MESSAGE, error, requestUrl));
  }

  if (!response.ok) {
    throw new Error(await getAdminErrorMessage(response, ADMIN_EXPORT_ERROR_MESSAGE));
  }

  const fileName = readExportFileName(response.headers.get("content-disposition"));

  return {
    csv: await response.text(),
    fileName,
  };
}

async function requestJson<TSchema extends { parse: (value: unknown) => unknown }>(options: {
  authorization?: string;
  body?: unknown;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PATCH";
  requestUrl: string;
  responseSchema: TSchema;
  stableMessage: string;
}): Promise<ReturnType<TSchema["parse"]>> {
  let response: Response;

  try {
    response = await fetch(options.requestUrl, {
      method: options.method ?? "GET",
      headers: {
        ...(options.authorization ? { Authorization: `Bearer ${options.authorization}` } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error: unknown) {
    throw new Error(getApiRequestErrorMessage(options.stableMessage, error, options.requestUrl));
  }

  if (!response.ok) {
    throw new Error(await getAdminErrorMessage(response, options.stableMessage));
  }

  return options.responseSchema.parse(await response.json()) as ReturnType<TSchema["parse"]>;
}

async function getAdminErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const responseBody = (await response.json()) as { message?: unknown };
    const publicErrorMessage =
      typeof responseBody.message === "string" ? responseBody.message.trim() : "";

    if (SAFE_ADMIN_ERROR_MESSAGES.has(publicErrorMessage)) {
      return publicErrorMessage;
    }
  } catch {
    // Fall through to the stable default message.
  }

  return fallbackMessage;
}

function normalizeOptionalText(value: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  return value.trim();
}

function readExportFileName(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/u);

  if (match?.[1]) {
    return match[1];
  }

  return "moodmarble-export.csv";
}

export {
  ADMIN_ACCESS_MISSING_MESSAGE,
  ADMIN_EXPORT_ERROR_MESSAGE,
  ADMIN_PANEL_ERROR_MESSAGE,
  type AdminExportResult,
  type AdminPanelShellBundle,
  type AdminWorkspaceSession,
  type CreateAdminWorkspaceInput,
  type LoadAdminPanelShellInput,
};

export interface AdminManagerCodeItem {
  id: string;
  code: string;
  team_id: string;
  team_name: string;
  expires_at: string;
  used_at: string | null;
  is_revoked: boolean;
  status: "active" | "used" | "expired" | "revoked";
}

export interface AdminManagerCodeListResult {
  codes: AdminManagerCodeItem[];
}

export interface AdminGenerateManagerCodeResult {
  code: string;
  team_id: string;
  expires_at: string;
}

const MANAGER_CODE_ERROR_MESSAGE = "Unable to manage codes right now.";

export async function generateManagerCode(input: {
  adminJwt: string;
  workspaceId: string;
  teamId: string;
  expiresInDays?: number;
}): Promise<AdminGenerateManagerCodeResult> {
  const response = await fetch(
    createApiUrl(`/admin/workspace/${input.workspaceId}/manager-codes`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.adminJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        team_id: input.teamId,
        expires_in_days: input.expiresInDays ?? 7,
      }),
    },
  );
  if (!response.ok) throw new Error(MANAGER_CODE_ERROR_MESSAGE);
  return response.json() as Promise<AdminGenerateManagerCodeResult>;
}

export async function listManagerCodes(input: {
  adminJwt: string;
  workspaceId: string;
  teamId: string;
}): Promise<AdminManagerCodeListResult> {
  const response = await fetch(
    createApiUrl(`/admin/workspace/${input.workspaceId}/team/${input.teamId}/manager-codes`),
    { headers: { Authorization: `Bearer ${input.adminJwt}` } },
  );
  if (!response.ok) throw new Error(MANAGER_CODE_ERROR_MESSAGE);
  return response.json() as Promise<AdminManagerCodeListResult>;
}

export async function revokeManagerCode(input: {
  adminJwt: string;
  workspaceId: string;
  codeId: string;
}): Promise<void> {
  const response = await fetch(
    createApiUrl(`/admin/workspace/${input.workspaceId}/manager-codes/${input.codeId}`),
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${input.adminJwt}` },
    },
  );
  if (!response.ok) throw new Error(MANAGER_CODE_ERROR_MESSAGE);
}
