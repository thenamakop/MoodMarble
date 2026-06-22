import {
  buildManagerRouteParams,
  getNextDateSelection,
  resolveSelectedDate,
} from "@/features/dashboard/route-state";

describe("manager route state", () => {
  it("preserves an explicit start_date instead of recomputing the week from date", () => {
    expect(resolveSelectedDate("2026-06-22", "2026-06-16")).toEqual({
      date: "2026-06-22",
      startDate: "2026-06-16",
      label: "2026-06-22",
      hasExplicitStartDate: true,
    });
  });

  it("keeps the explicit start_date when navigating between manager dates", () => {
    const nextSelection = getNextDateSelection(
      resolveSelectedDate("2026-06-22", "2026-06-16"),
    );

    expect(nextSelection).toEqual({
      date: "2026-06-21",
      startDate: "2026-06-16",
      label: "2026-06-21",
      hasExplicitStartDate: true,
    });
    expect(
      buildManagerRouteParams({
        managerJwt: "manager-jwt-token",
        managerTeams: [{ teamId: "tm_product", label: "Product" }],
        selectedDate: nextSelection,
        selectedTeam: { teamId: "tm_product", label: "Product" },
      }),
    ).toMatchObject({
      date: "2026-06-21",
      start_date: "2026-06-16",
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
});
