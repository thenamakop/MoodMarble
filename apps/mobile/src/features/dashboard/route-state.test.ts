import { buildManagerRouteParams, resolveSelectedDate } from "@/features/dashboard/route-state";

describe("manager route state", () => {
  it("preserves an explicit start_date instead of recomputing the week from date", () => {
    expect(resolveSelectedDate("2026-06-22", "2026-06-16")).toEqual({
      date: "2026-06-22",
      startDate: "2026-06-16",
      label: "2026-06-22",
      hasExplicitStartDate: true,
    });
  });

  it("derives the week start from date when no explicit start_date is present", () => {
    expect(resolveSelectedDate("2026-06-22", null)).toEqual({
      date: "2026-06-22",
      startDate: "2026-06-22",
      label: "2026-06-22",
      hasExplicitStartDate: false,
    });
  });

  it("builds route params from selected state", () => {
    expect(
      buildManagerRouteParams({
        managerJwt: "manager-jwt-token",
        managerTeams: [{ teamId: "tm_product", label: "Product" }],
        selectedDate: {
          date: "2026-06-21",
          startDate: "2026-06-16",
          label: "2026-06-21",
          hasExplicitStartDate: true,
        },
        selectedTeam: { teamId: "tm_product", label: "Product" },
      }),
    ).toMatchObject({
      date: "2026-06-21",
      start_date: "2026-06-16",
    });
  });
});
