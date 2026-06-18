import {
  buildManagerRouteParams,
  getNextDateSelection,
  hasManagerAccess,
  parseManagerTeams,
  resolveSelectedDate,
  resolveSelectedTeam,
} from "@/features/dashboard/route-state";

describe("dashboard route state", () => {
  it("parses manager team options and resolves the selected team", () => {
    const teams = parseManagerTeams("tm_product:Product|tm_design:Design");

    expect(teams).toEqual([
      { teamId: "tm_product", label: "Product" },
      { teamId: "tm_design", label: "Design" },
    ]);
    expect(resolveSelectedTeam(teams, "tm_design")).toEqual({
      teamId: "tm_design",
      label: "Design",
    });
  });

  it("falls back to guarded manager access when the route does not include a manager jwt or team scope", () => {
    expect(hasManagerAccess(null, null)).toBe(false);
    expect(resolveSelectedTeam([], "tm_product")).toBeNull();
  });

  it("advances the selected date and keeps the correct weekly aggregate window", () => {
    const selection = resolveSelectedDate("2026-06-18", null);
    const nextSelection = getNextDateSelection(selection);

    expect(selection).toEqual({
      date: "2026-06-18",
      startDate: "2026-06-15",
      label: "2026-06-18",
    });
    expect(nextSelection).toEqual({
      date: "2026-06-17",
      startDate: "2026-06-15",
      label: "2026-06-17",
    });
  });

  it("builds refetch params that preserve manager-only scope while updating team or date", () => {
    const teams = parseManagerTeams("tm_product:Product|tm_design:Design");
    const selectedDate = resolveSelectedDate("2026-06-18", null);

    expect(
      buildManagerRouteParams({
        managerJwt: "manager-jwt-token",
        managerTeams: teams,
        selectedDate,
        selectedTeam: teams[1],
      }),
    ).toEqual({
      date: "2026-06-18",
      manager_jwt: "manager-jwt-token",
      manager_teams: "tm_product:Product|tm_design:Design",
      start_date: "2026-06-15",
      team_id: "tm_design",
      team_name: "Design",
    });
  });
});
