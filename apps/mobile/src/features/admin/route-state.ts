type AdminSectionFocus =
  | "overview"
  | "workspace"
  | "team"
  | "join-code"
  | "export";

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

export { hasAdminAccess, parseAdminTeams, type AdminSectionFocus };
