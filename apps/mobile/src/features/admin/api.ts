const ADMIN_PANEL_ERROR_MESSAGE =
  "Unable to load the admin control panel right now.";
const ADMIN_ACCESS_MISSING_MESSAGE =
  "Admin access missing. Open the admin panel from a valid admin link again.";

interface LoadAdminPanelShellInput {
  adminJwt: string;
  workspaceId: string;
  workspaceName: string | null;
  joinCode: string | null;
  teamNames: string[];
}

interface AdminPanelShellBundle {
  workspaceId: string;
  workspaceName: string | null;
  joinCode: string | null;
  teamNames: string[];
}

export async function loadAdminPanelShell(
  input: LoadAdminPanelShellInput,
): Promise<AdminPanelShellBundle | null> {
  if (!input.adminJwt.trim() || !input.workspaceId.trim()) {
    throw new Error(ADMIN_ACCESS_MISSING_MESSAGE);
  }

  await Promise.resolve();

  const normalizedWorkspaceName = normalizeOptionalText(input.workspaceName);
  const normalizedJoinCode =
    normalizeOptionalText(input.joinCode)?.toUpperCase() ?? null;
  const normalizedTeamNames = input.teamNames
    .map((teamName) => teamName.trim())
    .filter(Boolean);

  if (
    !normalizedWorkspaceName &&
    !normalizedJoinCode &&
    normalizedTeamNames.length === 0
  ) {
    return null;
  }

  return {
    workspaceId: input.workspaceId,
    workspaceName: normalizedWorkspaceName,
    joinCode: normalizedJoinCode,
    teamNames: normalizedTeamNames,
  };
}

function normalizeOptionalText(value: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  return value.trim();
}

export {
  ADMIN_ACCESS_MISSING_MESSAGE,
  ADMIN_PANEL_ERROR_MESSAGE,
  type AdminPanelShellBundle,
  type LoadAdminPanelShellInput,
};
