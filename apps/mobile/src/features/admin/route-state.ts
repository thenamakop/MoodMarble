type AdminSectionFocus =
  | "overview"
  | "workspace"
  | "team"
  | "join-code"
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

export {
  hasAdminAccess,
  parseAdminTeamOptions,
  parseAdminTeams,
  type AdminSectionFocus,
  type AdminTeamOption,
};
