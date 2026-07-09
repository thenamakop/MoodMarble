import {
  createDashboardPrivacyState,
  DASHBOARD_PRIVACY_THRESHOLDS,
  getDashboardHourPrivacy,
  getDashboardWindowPrivacy,
  toDashboardCountValue,
  toDashboardScoreValue,
} from "../../src/services/dashboard-privacy";

describe("dashboard privacy service", () => {
  it("shows visible privacy when submission and team-size thresholds are met", () => {
    expect(
      getDashboardWindowPrivacy({
        totalSubmissions: 8,
        teamMemberCount: 5,
      }),
    ).toEqual({
      visibility: "visible",
      reasons: [],
      thresholds: DASHBOARD_PRIVACY_THRESHOLDS,
    });
  });

  it("hides a dashboard window below the minimum submission threshold", () => {
    expect(
      getDashboardWindowPrivacy({
        totalSubmissions: 4,
        teamMemberCount: 8,
      }),
    ).toEqual({
      visibility: "hidden",
      reasons: ["minimum_submissions"],
      thresholds: DASHBOARD_PRIVACY_THRESHOLDS,
    });
  });

  it("blurs a dashboard window when the team is too small for precise values", () => {
    expect(
      getDashboardWindowPrivacy({
        totalSubmissions: 8,
        teamMemberCount: 4,
      }),
    ).toEqual({
      visibility: "blurred",
      reasons: ["minimum_members_for_precise_values"],
      thresholds: DASHBOARD_PRIVACY_THRESHOLDS,
    });
  });

  it("hides an hourly bucket when the hour does not meet the drill-down threshold", () => {
    expect(
      getDashboardHourPrivacy({
        totalSubmissions: 8,
        teamMemberCount: 5,
        hourSubmissions: 2,
      }),
    ).toEqual({
      visibility: "hidden",
      reasons: ["minimum_hourly_submissions"],
      thresholds: DASHBOARD_PRIVACY_THRESHOLDS,
    });
  });

  it("keeps all relevant reasons in a stable order when multiple privacy rules apply", () => {
    expect(
      getDashboardHourPrivacy({
        totalSubmissions: 4,
        teamMemberCount: 3,
        hourSubmissions: 2,
      }),
    ).toEqual({
      visibility: "hidden",
      reasons: [
        "minimum_submissions",
        "minimum_members_for_precise_values",
        "minimum_hourly_submissions",
      ],
      thresholds: DASHBOARD_PRIVACY_THRESHOLDS,
    });
  });

  it("converts visible values to exact metrics", () => {
    const privacy = createDashboardPrivacyState([]);

    expect(toDashboardCountValue(8, privacy)).toEqual({
      kind: "exact",
      value: 8,
    });
    expect(toDashboardScoreValue(6.4, privacy)).toEqual({
      kind: "exact",
      value: 6.4,
    });
  });

  it("converts blurred values to privacy-safe ranges", () => {
    const privacy = createDashboardPrivacyState(["minimum_members_for_precise_values"]);

    expect(toDashboardCountValue(8, privacy)).toEqual({
      kind: "range",
      min: 5,
      max: 9,
    });
    expect(toDashboardCountValue(0, privacy)).toEqual({
      kind: "range",
      min: 0,
      max: 1,
    });
    expect(toDashboardScoreValue(5.4, privacy)).toEqual({
      kind: "range",
      min: 4,
      max: 6,
    });
  });

  it("converts hidden values to hidden metrics", () => {
    const privacy = createDashboardPrivacyState(["minimum_submissions"]);

    expect(toDashboardCountValue(8, privacy)).toEqual({
      kind: "hidden",
    });
    expect(toDashboardScoreValue(6.4, privacy)).toEqual({
      kind: "hidden",
    });
  });
});
