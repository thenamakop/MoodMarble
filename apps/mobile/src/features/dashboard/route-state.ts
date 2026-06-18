interface ManagerTeamOption {
  teamId: string;
  label: string;
}

interface ManagerDateSelection {
  date: string;
  startDate: string;
  label: string;
}

function parseManagerTeams(
  encodedManagerTeams: string | null,
): ManagerTeamOption[] {
  if (!encodedManagerTeams) {
    return [];
  }

  return encodedManagerTeams
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

function resolveSelectedTeam(
  managerTeams: ManagerTeamOption[],
  teamIdParam: string | null,
): ManagerTeamOption | null {
  if (managerTeams.length === 0) {
    return null;
  }

  return (
    managerTeams.find((team) => team.teamId === teamIdParam) ??
    managerTeams[0] ??
    null
  );
}

function resolveSelectedDate(
  dateParam: string | null,
  startDateParam: string | null,
): ManagerDateSelection {
  const fallbackDate = dateParam ?? startDateParam ?? getTodayDate();
  return buildDateSelection(fallbackDate);
}

function getNextDateSelection(
  currentSelection: ManagerDateSelection,
): ManagerDateSelection {
  return buildDateSelection(shiftDateByDays(currentSelection.date, -1));
}

function buildDateSelection(date: string): ManagerDateSelection {
  return {
    date,
    startDate: getWeekStartDate(date),
    label: date,
  };
}

function buildManagerRouteParams({
  managerJwt,
  managerTeams,
  selectedDate,
  selectedTeam,
}: {
  managerJwt: string | null;
  managerTeams: ManagerTeamOption[];
  selectedDate: ManagerDateSelection;
  selectedTeam: ManagerTeamOption | null;
}) {
  return {
    date: selectedDate.date,
    manager_jwt: managerJwt ?? undefined,
    manager_teams:
      managerTeams.length > 0
        ? managerTeams.map((team) => `${team.teamId}:${team.label}`).join("|")
        : undefined,
    start_date: selectedDate.startDate,
    team_id: selectedTeam?.teamId,
    team_name: selectedTeam?.label,
  };
}

function hasManagerAccess(
  managerJwt: string | null,
  selectedTeam: ManagerTeamOption | null,
): boolean {
  return Boolean(managerJwt && selectedTeam);
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStartDate(date: string): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = nextDate.getUTCDay();
  const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  nextDate.setUTCDate(nextDate.getUTCDate() - dayOffset);
  return nextDate.toISOString().slice(0, 10);
}

function shiftDateByDays(date: string, deltaDays: number): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + deltaDays);
  return nextDate.toISOString().slice(0, 10);
}

export {
  buildDateSelection,
  buildManagerRouteParams,
  getNextDateSelection,
  hasManagerAccess,
  parseManagerTeams,
  resolveSelectedDate,
  resolveSelectedTeam,
  type ManagerDateSelection,
  type ManagerTeamOption,
};
