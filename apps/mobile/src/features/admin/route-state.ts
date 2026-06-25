import type { AdminSession } from "./session";

type AdminSectionFocus =
  | "overview"
  | "workspace"
  | "team"
  | "join-code"
  | "manager-codes"
  | "export";

interface AdminTeamOption {
  teamId: string;
  label: string;
}

function parseAdminTeams(encodedAdminTeams: string | null): string[] {
  if (!encodedAdminTeams) {
    return [];
  }

  return encodedAdminTeams
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [_teamId, ...labelParts] = entry.split(":");
      return labelParts.join(":").trim() || entry.split(":")[0]?.trim() || "";
    })
    .filter((entry) => entry.length > 0);
}

function hasAdminAccess(
  adminJwt: string | null,
  workspaceId: string | null,
): boolean {
  return Boolean(adminJwt && workspaceId);
}

function parseAdminTeamOptions(
  encodedAdminTeams: string | null,
): AdminTeamOption[] {
  if (!encodedAdminTeams) {
    return [];
  }

  return encodedAdminTeams
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [teamId, ...labelParts] = entry.split(":");
      return {
        teamId: teamId?.trim() ?? "",
        label: labelParts.join(":").trim() || (teamId?.trim() ?? ""),
      };
    })
    .filter((entry) => entry.teamId.length > 0);
}

function buildAdminRouteParams(session: AdminSession): Record<string, string> {
  const params: Record<string, string> = {
    admin_jwt: session.adminJwt,
    workspace_id: session.workspaceId,
  };

  if (session.workspaceName) {
    params.workspace_name = session.workspaceName;
  }

  return params;
}

function parseAdminRouteParams(
  params: Record<string, string | string[] | undefined>,
): Partial<AdminSession> {
  return {
    adminJwt: normalizeSearchParam(params.admin_jwt) ?? undefined,
    workspaceId: normalizeSearchParam(params.workspace_id) ?? undefined,
    workspaceName: normalizeSearchParam(params.workspace_name) ?? undefined,
  };
}

function normalizeSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((entry) => entry.trim().length > 0);
    return firstValue ?? null;
  }

  return null;
}

export {
  hasAdminAccess,
  parseAdminTeamOptions,
  parseAdminTeams,
  buildAdminRouteParams,
  parseAdminRouteParams,
  type AdminSectionFocus,
  type AdminTeamOption,
};
